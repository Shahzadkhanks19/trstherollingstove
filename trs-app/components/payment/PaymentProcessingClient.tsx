"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faCheck,
  faCircleExclamation,
  faClock,
  faCreditCard,
  faHeadset,
  faLock,
  faRotateRight,
  faShieldHalved,
  faSpinner,
  faUtensils,
  faWallet,
} from "@fortawesome/free-solid-svg-icons";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "trs.pendingPaymentOrderId";

type ApiEnvelope<T> = { success: boolean; message: string; data: T };
type Stage = "loading" | "ready" | "opening" | "cancelled" | "failed" | "verifying" | "unknown" | "invalid";

type PaymentOrder = {
  key: string;
  keyId?: string;
  orderId: string;
  providerOrderId?: string;
  amount: number;
  currency: string;
  orderNumber: string;
};

type StatusData = {
  order: {
    id: string;
    orderNumber: string;
    items: Array<{ _id?: string; name: string; quantity: number; lineTotal: number }>;
    itemCount: number;
    subtotal: number;
    taxTotal: number;
    couponDiscount: number;
    coinDiscount: number;
    discountTotal: number;
    grandTotal: number;
    orderMode: "dine_in" | "takeaway";
    requestedPickupAt?: string | null;
    estimatedReadyAt?: string | null;
    status: string;
    paymentStatus: "pending" | "paid" | "failed" | "refunded";
    customerSnapshot: { name: string; phone?: string; email?: string };
  };
  payment: null | {
    status: string;
    providerOrderId: string;
    providerPaymentId?: string;
    amount: number;
    currency: string;
    failureDescription?: string;
  };
};

function money(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);
}

function formatTime(value?: string | null) {
  if (!value) return "As soon as possible";
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>('script[data-trs-razorpay="true"]');
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Razorpay checkout could not be loaded.")), { once: true });
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.trsRazorpay = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Razorpay checkout could not be loaded."));
    document.head.appendChild(script);
  });
}

function activeTitle(stage: Stage) {
  return ["loading", "opening"].includes(stage) ? "Processing Payment..." : "Secure Payment";
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
    const response = await fetch(`/api/v1/customer/payments/status?orderId=${encodeURIComponent(orderId)}`, { cache: "no-store" });
    const body = (await response.json()) as ApiEnvelope<StatusData>;
    if (!response.ok) throw new Error(body.message || "Unable to load payment status.");
    setStatusData(body.data);
    statusDataRef.current = body.data;
    if (body.data.order.paymentStatus === "paid") {
      sessionStorage.removeItem(STORAGE_KEY);
      window.location.replace(`/order-success?order=${encodeURIComponent(body.data.order.orderNumber)}`);
      return body.data;
    }
    if (["cancelled", "rejected"].includes(body.data.order.status)) {
      throw new Error("This order can no longer be paid.");
    }
    return body.data;
  }, []);

  const verify = useCallback(async (response: RazorpaySuccessResponse) => {
    const orderId = orderIdRef.current;
    setStage("verifying");
    setMessage("Confirming your payment securely");
    try {
      const verifyResponse = await fetch("/api/v1/customer/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        }),
      });
      const body = (await verifyResponse.json()) as { message?: string };
      if (!verifyResponse.ok) throw new Error(body.message || "Payment verification failed.");
      sessionStorage.removeItem(STORAGE_KEY);
      const orderNumber = statusDataRef.current?.order.orderNumber;
      window.location.replace(orderNumber ? `/order-success?order=${encodeURIComponent(orderNumber)}` : "/order-success");
    } catch (error) {
      setStage("unknown");
      setMessage(error instanceof Error ? error.message : "Payment confirmation is still pending.");
    } finally {
      busyRef.current = false;
    }
  }, []);

  const recordFailure = useCallback(async (response: RazorpayFailureResponse) => {
    const paymentOrder = paymentOrderRef.current;
    const orderId = orderIdRef.current;
    const razorpayOrderId =
      response.error?.metadata?.order_id || paymentOrder?.orderId || paymentOrder?.providerOrderId;

    if (!orderId || !razorpayOrderId) return;

    try {
      await fetch("/api/v1/customer/payments/fail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          razorpayOrderId,
          code: response.error?.code,
          description: response.error?.description,
          reason: response.error?.reason,
        }),
      });
    } catch {
      // The webhook remains the authoritative asynchronous fallback.
    }
  }, []);

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
        order_id: currentPaymentOrder.orderId || currentPaymentOrder.providerOrderId || "",
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
        setMessage(response.error?.description || "Your payment could not be completed.");
      });
      checkout.open();
    } catch (error) {
      busyRef.current = false;
      setStage("failed");
      setMessage(error instanceof Error ? error.message : "The payment window could not be opened.");
    }
  }, [recordFailure, verify]);

  const prepare = useCallback(async (autoOpen: boolean) => {
    const orderId = orderIdRef.current;
    if (!orderId) return;
    try {
      setStage("loading");
      setMessage("Validating your order");
      await checkStatus(orderId);
      setMessage("Creating a secure payment session");
      const response = await fetch("/api/v1/customer/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const body = (await response.json()) as ApiEnvelope<PaymentOrder>;
      if (!response.ok) throw new Error(body.message || "Unable to create payment session.");
      paymentOrderRef.current = body.data;
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
      setMessage(error instanceof Error ? error.message : "Payment session not found.");
    }
  }, [checkStatus, openCheckout]);

  useEffect(() => {
    const queryId = new URLSearchParams(window.location.search).get("orderId") ?? "";
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

  const title = stage === "cancelled" ? "Payment Cancelled" : stage === "failed" ? "Payment Failed" : stage === "unknown" || stage === "verifying" ? "Confirming Payment" : stage === "invalid" ? "Payment Session Not Found" : activeTitle(stage);
  const active = ["loading", "opening", "verifying"].includes(stage);
  const progress = stage === "loading" ? 38 : stage === "opening" ? 78 : stage === "verifying" ? 92 : stage === "ready" ? 100 : 0;
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
            <Image src="/images/trs-logo.png" alt="The Rolling Stove" width={88} height={88} className="h-14 w-14 object-contain" priority />
          </div>

          <div className="relative overflow-hidden px-6 py-10 sm:px-10 sm:py-14">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_20%,rgba(201,154,46,0.12),transparent_26%),radial-gradient(circle_at_85%_70%,rgba(227,23,47,0.08),transparent_28%)]" />

            <div className="relative mx-auto max-w-xl text-center" aria-live="polite">
              <span className={`mx-auto grid h-20 w-20 place-items-center rounded-full border ${stage === "cancelled" || stage === "failed" || stage === "invalid" ? "border-[#E3172F]/15 bg-[#E3172F]/10 text-[#C9162B]" : "border-[#C99A2E]/20 bg-[#C99A2E]/10 text-[#A97814]"}`}>
                <FontAwesomeIcon icon={active ? faSpinner : stage === "ready" ? faCheck : faCircleExclamation} className={`h-8 ${active ? "animate-spin" : ""}`} />
              </span>

              <p className="mt-7 text-xs font-black uppercase tracking-[0.22em] text-[#B37A12]">The Rolling Stove</p>
              <h1 className="mt-3 text-3xl font-black uppercase tracking-[-0.04em] text-[#B7192C] sm:text-5xl">{title}</h1>
              <div className="mx-auto mt-5 h-px w-36 bg-gradient-to-r from-transparent via-[#C99A2E] to-transparent" />
              <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-[#625A50]">{message}</p>
              {active && (
                <div className="mx-auto mt-7 max-w-lg rounded-2xl border border-[#EADFCC] bg-white/80 p-4 text-left shadow-sm sm:p-5">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#8D6515]">Payment progress</span>
                    <span className="text-xs font-black tabular-nums text-[#B7192C]">{progress}%</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F2E8D8]" role="progressbar" aria-label="Payment preparation progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                    <div className="h-full rounded-full bg-gradient-to-r from-[#C99A2E] to-[#C91F32] transition-[width] duration-700 ease-out motion-reduce:transition-none" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {progressSteps.map((step, index) => (
                      <div key={step.label} className="flex items-center gap-2 text-[11px] font-bold text-[#625A50]">
                        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[10px] ${step.complete ? "border-[#C91F32] bg-[#C91F32] text-white" : "border-[#DCCDAF] bg-[#FFF8EC] text-[#8D6515]"}`}>
                          {step.complete ? <FontAwesomeIcon icon={faCheck} className="h-2.5" /> : index + 1}
                        </span>
                        <span>{step.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {active && <p className="mt-4 text-xs font-semibold text-[#8A8176]">Please don&apos;t close this page.</p>}
              {stage === "cancelled" && <p className="mt-3 text-xs text-[#746B60]">Food preparation begins only after successful payment.</p>}
              {stage === "unknown" && <p className="mt-3 text-xs font-bold text-[#A97814]">Please do not make another payment yet.</p>}

              {stage === "failed" && (
                <div className="mx-auto mt-7 max-w-lg rounded-2xl border border-[#F2D4D8] bg-[#FFF5F6] p-4 text-left sm:p-5" role="alert">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#A97814]">Failure reason</p>
                  <p className="mt-2 text-sm font-bold leading-6 text-[#8F1726]">{message}</p>
                  <p className="mt-3 border-t border-[#F2D4D8] pt-3 text-xs leading-5 text-[#746B60]">
                    If an amount appears deducted, wait for your bank or payment provider to update the transaction before trying again.
                  </p>
                </div>
              )}

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
                {(stage === "ready" || stage === "cancelled" || stage === "failed") && (
                  <button type="button" onClick={() => void openCheckout()} className="min-h-12 rounded-xl bg-[#C91F32] px-6 text-xs font-black uppercase tracking-wider text-white shadow-[0_12px_24px_rgba(201,31,50,0.18)] outline-none transition hover:bg-[#AE1728] focus-visible:ring-2 focus-visible:ring-[#C91F32] focus-visible:ring-offset-2">
                    {stage === "ready" ? "Open Payment Window" : stage === "cancelled" ? "Resume Payment" : "Retry Payment"}
                  </button>
                )}
                {stage === "failed" && (
                  <button type="button" onClick={() => void openCheckout()} className="min-h-12 rounded-xl border border-[#C99A2E] bg-[#FFF8E8] px-6 text-xs font-black uppercase tracking-wider text-[#8F6512] transition hover:bg-[#FFF1CC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C99A2E] focus-visible:ring-offset-2">
                    <FontAwesomeIcon icon={faWallet} className="mr-2 h-3" />Different Payment Method
                  </button>
                )}
                {stage === "unknown" && (
                  <button type="button" onClick={() => void checkStatus(orderIdRef.current)} className="min-h-12 rounded-xl bg-[#C91F32] px-6 text-xs font-black uppercase tracking-wider text-white shadow-[0_12px_24px_rgba(201,31,50,0.18)] outline-none transition hover:bg-[#AE1728] focus-visible:ring-2 focus-visible:ring-[#C91F32] focus-visible:ring-offset-2">Check Payment Status</button>
                )}
                {(stage === "failed" || stage === "invalid") && (
                  <Link href="/checkout" className="grid min-h-12 place-items-center rounded-xl border border-[#C91F32] bg-white px-6 text-xs font-black uppercase tracking-wider text-[#B7192C] transition hover:bg-[#FFF1F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C91F32] focus-visible:ring-offset-2"><span><FontAwesomeIcon icon={faArrowLeft} className="mr-2 h-3" />Return to Checkout</span></Link>
                )}
                {stage === "cancelled" && (
                  <Link href="/cart" className="grid min-h-12 place-items-center rounded-xl border border-[#C91F32] bg-white px-6 text-xs font-black uppercase tracking-wider text-[#B7192C] transition hover:bg-[#FFF1F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C91F32] focus-visible:ring-offset-2"><span><FontAwesomeIcon icon={faArrowLeft} className="mr-2 h-3" />Return to Cart</span></Link>
                )}
                {stage === "failed" && (
                  <Link href="/contact" className="grid min-h-12 place-items-center rounded-xl border border-[#D8CDBB] bg-white px-6 text-xs font-black uppercase tracking-wider text-[#51483D] transition hover:bg-[#FFF9EF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C99A2E] focus-visible:ring-offset-2">
                    <span><FontAwesomeIcon icon={faHeadset} className="mr-2 h-3 text-[#B7192C]" />Contact Support</span>
                  </Link>
                )}
                {stage === "invalid" && (
                  <button type="button" onClick={() => void prepare(false)} className="min-h-12 rounded-xl bg-[#C91F32] px-6 text-xs font-black uppercase tracking-wider text-white shadow-[0_12px_24px_rgba(201,31,50,0.18)] outline-none transition hover:bg-[#AE1728] focus-visible:ring-2 focus-visible:ring-[#C91F32] focus-visible:ring-offset-2"><FontAwesomeIcon icon={faRotateRight} className="mr-2 h-3" />Try Again</button>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 border-t border-[#EADFCC] bg-[#FFF8EC] px-6 py-5 text-[11px] font-semibold text-[#625A50] sm:grid-cols-3 sm:px-8">
            <span><FontAwesomeIcon icon={faShieldHalved} className="mr-2 text-[#B7192C]" />Secure Razorpay payment</span>
            <span><FontAwesomeIcon icon={faLock} className="mr-2 text-[#B7192C]" />Details handled by Razorpay</span>
            <span><FontAwesomeIcon icon={faCreditCard} className="mr-2 text-[#B7192C]" />UPI, cards, net banking</span>
          </div>
        </section>

        <aside className="rounded-[28px] border border-[#EADFCC] bg-white p-6 shadow-[0_22px_60px_rgba(88,56,19,0.12)] sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#B37A12]">Order Summary</p>
          <h2 className="mt-2 text-2xl font-black uppercase text-[#171717]">{statusData?.order.orderNumber ?? "Pending Order"}</h2>
          <div className="mt-5 h-px w-full bg-gradient-to-r from-[#C99A2E] via-[#E7C980] to-transparent" />

          <div className="mt-6 space-y-4 border-y border-[#EEE5D8] py-5">
            {statusData?.order.items.slice(0, 4).map((item, index) => (
              <div key={item._id ?? `${item.name}-${index}`} className="flex justify-between gap-4 text-sm">
                <span className="text-[#5F574D]">{item.quantity} × {item.name}</span><strong>{money(item.lineTotal)}</strong>
              </div>
            )) ?? <p className="text-sm text-[#756D63]">Loading order details…</p>}
          </div>

          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{money(statusData?.order.subtotal ?? 0)}</span></div>
            <div className="flex justify-between"><span>Taxes</span><span>{money(statusData?.order.taxTotal ?? 0)}</span></div>
            {(statusData?.order.discountTotal ?? 0) > 0 && <div className="flex justify-between text-green-700"><span>Discount</span><span>-{money(statusData?.order.discountTotal ?? 0)}</span></div>}
            <div className="flex justify-between border-t border-[#EEE5D8] pt-4 text-lg font-black"><span>Total</span><span className="text-[#B7192C]">{money(statusData?.order.grandTotal ?? 0)}</span></div>
          </div>

          <div className="mt-6 rounded-2xl border border-[#F0E2BD] bg-[#FFF7E6] p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#8D6515]"><FontAwesomeIcon icon={faClock} className="mr-2" />Estimated Preparation</p>
            <p className="mt-2 text-lg font-black text-[#B7192C]">Ready around {formatTime(statusData?.order.estimatedReadyAt)}</p>
          </div>

          <div className="mt-4 rounded-2xl border border-[#F4DDDF] bg-[#FFF3F4] p-4 text-xs leading-6 text-[#625A50]">
            <FontAwesomeIcon icon={faUtensils} className="mr-2 text-[#B7192C]" />{statusData?.order.orderMode === "dine_in" ? "Dine-in" : "Pickup"} • {formatTime(statusData?.order.requestedPickupAt)}
          </div>

          <p className="mt-5 text-[11px] leading-5 text-[#756D63]">Your payment details are securely handled by Razorpay and are not stored by TRS.</p>
        </aside>
      </div>
    </main>
  );
}
