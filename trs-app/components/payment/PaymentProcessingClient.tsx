"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faCircleExclamation,
  faCreditCard,
  faLock,
  faShieldHalved,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { PaymentActions, type PaymentStage } from "@/components/payment/PaymentActions";
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

function activeTitle(stage: Stage) {
  return ["loading", "opening"].includes(stage)
    ? "Processing Payment..."
    : "Secure Payment";
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

  const title =
    stage === "cancelled"
      ? "Payment Cancelled"
      : stage === "failed"
        ? "Payment Failed"
        : stage === "unknown" || stage === "verifying"
          ? "Confirming Payment"
          : stage === "invalid"
            ? "Payment Session Not Found"
            : activeTitle(stage);
  const active = ["loading", "opening", "verifying"].includes(stage);
  const progress =
    stage === "loading"
      ? 38
      : stage === "opening"
        ? 78
        : stage === "verifying"
          ? 92
          : stage === "ready"
            ? 100
            : 0;
  const progressSteps = [
    { label: "Validating order", complete: progress >= 30 },
    { label: "Creating secure session", complete: progress >= 65 },
    { label: "Connecting to Razorpay", complete: progress >= 90 },
  ];

  return (
    <main className="min-h-screen bg-[#FFF9EF] px-4 py-8 text-[#171717] sm:py-12">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
        <section className="overflow-hidden rounded-[28px] border border-[#EADFCC] bg-[#FFFCF6] text-[#171717] shadow-[0_22px_60px_rgba(88,56,19,0.12)]">
          <div className="border-b border-[#EADFCC] bg-white/65 px-6 py-5 sm:px-8">
            <Image
              src="/images/trs-logo.png"
              alt="The Rolling Stove"
              width={88}
              height={88}
              className="h-14 w-14 object-contain"
              priority
            />
          </div>

          <div className="relative overflow-hidden px-6 py-10 sm:px-10 sm:py-14">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_20%,rgba(201,154,46,0.12),transparent_26%),radial-gradient(circle_at_85%_70%,rgba(227,23,47,0.08),transparent_28%)]"
            />

            <div
              className="relative mx-auto max-w-xl text-center"
              aria-live="polite"
            >
              <span
                className={`mx-auto grid h-20 w-20 place-items-center rounded-full border ${stage === "cancelled" || stage === "failed" || stage === "invalid" ? "border-[#E3172F]/15 bg-[#E3172F]/10 text-[#C9162B]" : "border-[#C99A2E]/20 bg-[#C99A2E]/10 text-[#A97814]"}`}
              >
                <FontAwesomeIcon
                  icon={
                    active
                      ? faSpinner
                      : stage === "ready"
                        ? faCheck
                        : faCircleExclamation
                  }
                  className={`h-8 ${active ? "animate-spin" : ""}`}
                />
              </span>

              <p className="mt-7 text-xs font-black uppercase tracking-[0.22em] text-[#B37A12]">
                The Rolling Stove
              </p>
              <h1 className="mt-3 text-3xl font-black uppercase tracking-[-0.04em] text-[#B7192C] sm:text-5xl">
                {title}
              </h1>
              <div className="mx-auto mt-5 h-px w-36 bg-gradient-to-r from-transparent via-[#C99A2E] to-transparent" />
              <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-[#625A50]">
                {message}
              </p>
              {active && (
                <div className="mx-auto mt-7 max-w-lg rounded-2xl border border-[#EADFCC] bg-white/80 p-4 text-left shadow-sm sm:p-5">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#8D6515]">
                      Payment progress
                    </span>
                    <span className="text-xs font-black tabular-nums text-[#B7192C]">
                      {progress}%
                    </span>
                  </div>
                  <div
                    className="mt-3 h-2 overflow-hidden rounded-full bg-[#F2E8D8]"
                    role="progressbar"
                    aria-label="Payment preparation progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress}
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#C99A2E] to-[#C91F32] transition-[width] duration-700 ease-out motion-reduce:transition-none"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {progressSteps.map((step, index) => (
                      <div
                        key={step.label}
                        className="flex items-center gap-2 text-[11px] font-bold text-[#625A50]"
                      >
                        <span
                          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[10px] ${step.complete ? "border-[#C91F32] bg-[#C91F32] text-white" : "border-[#DCCDAF] bg-[#FFF8EC] text-[#8D6515]"}`}
                        >
                          {step.complete ? (
                            <FontAwesomeIcon icon={faCheck} className="h-2.5" />
                          ) : (
                            index + 1
                          )}
                        </span>
                        <span>{step.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {active && (
                <p className="mt-4 text-xs font-semibold text-[#8A8176]">
                  Please don&apos;t close this page.
                </p>
              )}
              {stage === "cancelled" && (
                <p className="mt-3 text-xs text-[#746B60]">
                  Food preparation begins only after successful payment.
                </p>
              )}
              {stage === "unknown" && (
                <p className="mt-3 text-xs font-bold text-[#A97814]">
                  Please do not make another payment yet.
                </p>
              )}

              {stage === "failed" && (
                <div
                  className="mx-auto mt-7 max-w-lg rounded-2xl border border-[#F2D4D8] bg-[#FFF5F6] p-4 text-left sm:p-5"
                  role="alert"
                >
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#A97814]">
                    Failure reason
                  </p>
                  <p className="mt-2 text-sm font-bold leading-6 text-[#8F1726]">
                    {message}
                  </p>
                  <p className="mt-3 border-t border-[#F2D4D8] pt-3 text-xs leading-5 text-[#746B60]">
                    If an amount appears deducted, wait for your bank or payment
                    provider to update the transaction before trying again.
                  </p>
                </div>
              )}

              <PaymentActions
                stage={stage}
                onOpenCheckout={() => void openCheckout()}
                onCheckStatus={() => void checkStatus(orderIdRef.current)}
                onPrepare={() => void prepare(false)}
              />
            </div>
          </div>

          <div className="grid gap-4 border-t border-[#EADFCC] bg-[#FFF8EC] px-6 py-5 text-[11px] font-semibold text-[#625A50] sm:grid-cols-3 sm:px-8">
            <span>
              <FontAwesomeIcon
                icon={faShieldHalved}
                className="mr-2 text-[#B7192C]"
              />
              Secure Razorpay payment
            </span>
            <span>
              <FontAwesomeIcon icon={faLock} className="mr-2 text-[#B7192C]" />
              Details handled by Razorpay
            </span>
            <span>
              <FontAwesomeIcon
                icon={faCreditCard}
                className="mr-2 text-[#B7192C]"
              />
              UPI, cards, net banking
            </span>
          </div>
        </section>

        <PaymentOrderSummary statusData={statusData} />
      </div>
    </main>
  );
}
