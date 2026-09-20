"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type PaymentStage } from "@/components/payment/PaymentActions";
import { PaymentStatusPanel } from "@/components/payment/PaymentStatusPanel";
import { loadRazorpay } from "@/components/payment/razorpay-loader";
import { openRazorpayCheckout } from "@/components/payment/razorpay-checkout";
import {
  clearPendingPaymentOrderId,
  redirectToOrderSuccess,
  resolvePendingPaymentOrderId,
  storePendingPaymentOrderId,
} from "@/components/payment/payment-session";
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

type Stage = PaymentStage;

type StatusData = PaymentStatusData;

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
      clearPendingPaymentOrderId();
      redirectToOrderSuccess(data.order.orderNumber);
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
      clearPendingPaymentOrderId();
      redirectToOrderSuccess(statusDataRef.current?.order.orderNumber);
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

    busyRef.current = true;
    setStage("opening");
    setMessage("Opening the secure payment window");

    try {
      openRazorpayCheckout({
        paymentOrder: currentPaymentOrder,
        statusData: currentStatusData,
        onDismiss: () => {
          busyRef.current = false;
          setStage("cancelled");
          setMessage("Your order has not been confirmed.");
        },
        onSuccess: verify,
        onFailure: (response) => {
          busyRef.current = false;
          void recordFailure(response);
          setStage("failed");
          setMessage(
            response.error?.description || "Your payment could not be completed.",
          );
        },
      });
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
    const orderId = resolvePendingPaymentOrderId();
    if (!orderId) {
      const invalidStateTimer = window.setTimeout(() => {
        setStage("invalid");
        setMessage("We could not find a valid pending payment.");
      }, 0);

      return () => window.clearTimeout(invalidStateTimer);
    }

    orderIdRef.current = orderId;
    storePendingPaymentOrderId(orderId);

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
