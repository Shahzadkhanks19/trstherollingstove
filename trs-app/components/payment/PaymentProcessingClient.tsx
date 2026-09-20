"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type PaymentStage } from "@/components/payment/PaymentActions";
import { PaymentStatusPanel } from "@/components/payment/PaymentStatusPanel";
import {
  PaymentOrderSummary,
  type PaymentStatusData,
} from "@/components/payment/PaymentOrderSummary";
import {
  createPaymentOrder,
  fetchPaymentStatus,
  recordPaymentFailure,
  verifyPayment,
  type PaymentOrder,
} from "@/components/payment/payment-api";

const STORAGE_KEY = "trs.pendingPaymentOrderId";

type Stage = PaymentStage;

type StatusData = PaymentStatusData;

function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>(
    'script[data-trs-razorpay="true"]',
  );
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Razorpay checkout could not be loaded.")),
        { once: true },
      );
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.trsRazorpay = "true";
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Razorpay checkout could not be loaded."));
    document.head.appendChild(script);
  });
}

export function PaymentProcessingClient() {
  const [stage, setStage] = useState<Stage>("loading");
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [message, setMessage] = useState("Validating your order");
  const orderIdRef = useRef("");
  const launchedRef = useRef(false);
  const busyRef = useRef(false);
  const paymentOrderRef = useRef<PaymentOrder | null>(null);
  const statusDataRef = useRef<StatusData | null>(null);

  const checkStatus = useCallback(async (orderId: string) => {
    const data = await fetchPaymentStatus(orderId);
    setStatusData(data);
    statusDataRef.current = data;
    if (data.order.paymentStatus === "paid") {
      sessionStorage.removeItem(STORAGE_KEY);
      window.location.replace(
        `/order-success?order=${encodeURIComponent(data.order.orderNumber)}`,
      );
      return data;
    }
    if (["cancelled", "rejected"].includes(data.order.status)) {
      throw new Error("This order can no longer be paid.");
    }
    return data;
  }, []);

  const verify = useCallback(async (response: RazorpaySuccessResponse) => {
    const orderId = orderIdRef.current;
    setStage("verifying");
    setMessage("Confirming your payment securely");
    try {
      await verifyPayment(orderId, response);
      sessionStorage.removeItem(STORAGE_KEY);
      const orderNumber = statusDataRef.current?.order.orderNumber;
      window.location.replace(
        orderNumber
          ? `/order-success?order=${encodeURIComponent(orderNumber)}`
          : "/order-success",
      );
    } catch (error) {
      setStage("unknown");
      setMessage(
        error instanceof Error
          ? error.message
          : "Payment confirmation is still pending.",
      );
    } finally {
      busyRef.current = false;
    }
  }, []);

  const recordFailure = useCallback(
    async (response: RazorpayFailureResponse) => {
      const paymentOrder = paymentOrderRef.current;
      const orderId = orderIdRef.current;
      const razorpayOrderId =
        response.error?.metadata?.order_id ||
        paymentOrder?.orderId ||
        paymentOrder?.providerOrderId;

      if (!orderId || !razorpayOrderId) return;

      try {
        await recordPaymentFailure(orderId, razorpayOrderId, response);
      } catch {
        // The webhook remains the authoritative asynchronous fallback.
      }
    },
    [],
  );

  const openCheckout = useCallback(async () => {
    const currentPaymentOrder = paymentOrderRef.current;
    const currentStatusData = statusDataRef.current;
    if (!currentPaymentOrder || !currentStatusData || busyRef.current) return;
    if (!window.Razorpay) {
      setStage("failed");
      setMessage("Razorpay checkout is unavailable. Try loading it again.");
      return;
    }
    busyRef.current = true;
    setStage("opening");
    setMessage("Opening the secure payment window");
    try {
      const checkout = new window.Razorpay({
        key: currentPaymentOrder.key || currentPaymentOrder.keyId || "",
        amount: currentPaymentOrder.amount,
        currency: currentPaymentOrder.currency,
        name: "The Rolling Stove",
        description: `Payment for ${currentPaymentOrder.orderNumber}`,
        order_id:
          currentPaymentOrder.orderId ||
          currentPaymentOrder.providerOrderId ||
          "",
        image: "/images/trs-logo.png",
        prefill: {
          name: currentStatusData.order.customerSnapshot.name,
          email: currentStatusData.order.customerSnapshot.email,
          contact: currentStatusData.order.customerSnapshot.phone,
        },
        theme: { color: "#E3172F" },
        modal: {
          escape: true,
          backdropclose: false,
          ondismiss: () => {
            busyRef.current = false;
            setStage("cancelled");
            setMessage("Your order has not been confirmed.");
          },
        },
        handler: verify,
      });
      checkout.on("payment.failed", (response) => {
        busyRef.current = false;
        void recordFailure(response);
        setStage("failed");
        setMessage(
          response.error?.description || "Your payment could not be completed.",
        );
      });
      checkout.open();
    } catch (error) {
      busyRef.current = false;
      setStage("failed");
      setMessage(
        error instanceof Error
          ? error.message
          : "The payment window could not be opened.",
      );
    }
  }, [recordFailure, verify]);

  const prepare = useCallback(
    async (autoOpen: boolean) => {
      const orderId = orderIdRef.current;
      if (!orderId) return;
      try {
        setStage("loading");
        setMessage("Validating your order");
        await checkStatus(orderId);
        setMessage("Creating a secure payment session");
        const paymentOrder = await createPaymentOrder(orderId);

        paymentOrderRef.current = paymentOrder;
        setMessage("Connecting securely to Razorpay");
        await loadRazorpay();
        setStage("ready");
        setMessage("Your secure payment session is ready.");
        if (autoOpen && !launchedRef.current) {
          launchedRef.current = true;
          window.setTimeout(() => void openCheckout(), 650);
        }
      } catch (error) {
        setStage("invalid");
        setMessage(
          error instanceof Error ? error.message : "Payment session not found.",
        );
      }
    },
    [checkStatus, openCheckout],
  );

  useEffect(() => {
    const queryId =
      new URLSearchParams(window.location.search).get("orderId") ?? "";
    const storedId = sessionStorage.getItem(STORAGE_KEY) ?? "";
    const orderId = /^[a-f\d]{24}$/i.test(queryId) ? queryId : storedId;
    if (!/^[a-f\d]{24}$/i.test(orderId)) {
      const invalidStateTimer = window.setTimeout(() => {
        setStage("invalid");
        setMessage("We could not find a valid pending payment.");
      }, 0);

      return () => window.clearTimeout(invalidStateTimer);
    }
    orderIdRef.current = orderId;
    sessionStorage.setItem(STORAGE_KEY, orderId);

    const prepareTimer = window.setTimeout(() => {
      void prepare(true);
    }, 0);

    return () => window.clearTimeout(prepareTimer);
  }, [prepare]);



  return (
    <main className="min-h-screen bg-[#FFF9EF] px-4 py-8 text-[#171717] sm:py-12">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
        <PaymentStatusPanel
          stage={stage}
          message={message}
          onOpenCheckout={() => void openCheckout()}
          onCheckStatus={() => void checkStatus(orderIdRef.current)}
          onPrepare={() => void prepare(false)}
        />

        <PaymentOrderSummary statusData={statusData} />
      </div>
    </main>
  );
}
