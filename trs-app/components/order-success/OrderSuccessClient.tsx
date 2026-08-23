"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRotateRight,
  faCheck,
  faClock,
  faCoins,
  faDownload,
  faEye,
  faLocationArrow,
  faReceipt,
  faShieldHalved,
  faSpinner,
  faUtensils,
} from "@fortawesome/free-solid-svg-icons";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

type SuccessData = {
  order: {
    id: string;
    orderNumber: string;
    items: Array<{
      id: string;
      name: string;
      quantity: number;
      variantName?: string;
      lineTotal: number;
    }>;
    itemCount: number;
    orderMode: "dine_in" | "takeaway";
    requestedPickupAt?: string | null;
    estimatedReadyAt?: string | null;
    status: string;
    paymentStatus: string;
    subtotal: number;
    taxTotal: number;
    discountTotal: number;
    grandTotal: number;
    coinsEarned: number;
    customerName: string;
    customerPhone?: string;
    createdAt: string;
  };
  payment: null | {
    paymentId: string;
    amount: number;
    currency: string;
    method?: string;
    paidAt?: string | null;
  };
};

type LoadState = "loading" | "ready" | "error";

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTime(value?: string | null) {
  if (!value) return "As soon as possible";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function maskPaymentId(value?: string) {
  if (!value) return "Confirmed by Razorpay";
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}••••${value.slice(-4)}`;
}

export function OrderSuccessClient() {
  const reduceMotion = useReducedMotion();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [data, setData] = useState<SuccessData | null>(null);
  const [message, setMessage] = useState("Loading your confirmed order…");

  const loadOrder = useCallback(async () => {
    const orderNumber = new URLSearchParams(window.location.search).get("order")?.trim() ?? "";
    if (!orderNumber) {
      setLoadState("error");
      setMessage("We could not find an order number for this confirmation.");
      return;
    }

    try {
      setLoadState("loading");
      const response = await fetch(
        `/api/v1/customer/orders/success?order=${encodeURIComponent(orderNumber)}`,
        { cache: "no-store" },
      );
      const body = (await response.json()) as ApiEnvelope<SuccessData>;
      if (!response.ok) {
        throw new Error(body.message || "Unable to load your confirmed order.");
      }
      setData(body.data);
      setLoadState("ready");
    } catch (error) {
      setLoadState("error");
      setMessage(error instanceof Error ? error.message : "Unable to load your confirmed order.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOrder();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadOrder]);

  if (loadState === "loading") {
    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#FFF9EF] px-4 py-16 text-[#171717]">
        <div className="w-full max-w-lg rounded-[28px] border border-[#EADFCC] bg-white p-8 text-center shadow-[0_22px_60px_rgba(88,56,19,0.12)] sm:p-12">
          <FontAwesomeIcon icon={faSpinner} className="h-10 animate-spin text-[#C91F32]" />
          <h1 className="mt-6 text-3xl font-black uppercase tracking-[-0.04em] text-[#B7192C]">Confirming Your Order</h1>
          <p className="mt-4 text-sm leading-7 text-[#6A6158]">Please wait while we load your payment confirmation.</p>
        </div>
      </main>
    );
  }

  if (loadState === "error" || !data) {
    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#FFF9EF] px-4 py-16 text-[#171717]">
        <div className="w-full max-w-xl rounded-[28px] border border-[#EADFCC] bg-white p-8 text-center shadow-[0_22px_60px_rgba(88,56,19,0.12)] sm:p-12">
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#FFF0F1] text-[#C91F32]">
            <FontAwesomeIcon icon={faReceipt} className="h-8" />
          </span>
          <h1 className="mt-6 text-3xl font-black uppercase tracking-[-0.04em] text-[#B7192C]">Order Details Unavailable</h1>
          <p className="mt-4 text-sm leading-7 text-[#6A6158]">{message}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button type="button" onClick={() => void loadOrder()} className="min-h-12 rounded-xl bg-[#C91F32] px-6 text-xs font-black uppercase tracking-wider text-white transition hover:bg-[#AE1728] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C91F32] focus-visible:ring-offset-2">
              Try Again
            </button>
            <Link href="/menu" className="grid min-h-12 place-items-center rounded-xl border border-[#C91F32] px-6 text-xs font-black uppercase tracking-wider text-[#B7192C] transition hover:bg-[#FFF2F3]">
              Return to Menu
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { order, payment } = data;
  const trackHref = `/track-order?order=${encodeURIComponent(order.orderNumber)}`;
  const invoiceHref = `/api/v1/customer/orders/${encodeURIComponent(order.id)}/invoice?download=true`;

  return (
    <main className="min-h-screen bg-[#FFF9EF] px-4 py-8 text-[#171717] sm:py-12">
      <div className="mx-auto w-full max-w-6xl">
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="overflow-hidden rounded-[32px] border border-[#EADFCC] bg-white shadow-[0_24px_70px_rgba(88,56,19,0.13)]"
        >
          <div className="relative overflow-hidden bg-[#FFFCF6] px-6 py-10 text-center sm:px-10 sm:py-14">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(circle_at_12%_20%,rgba(201,154,46,0.15),transparent_25%),radial-gradient(circle_at_88%_75%,rgba(201,31,50,0.10),transparent_27%)]" />

            <div className="relative">
              <motion.div
                initial={reduceMotion ? false : { scale: 0.55, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 190, damping: 15, delay: 0.08 }}
                className="relative mx-auto grid h-32 w-32 place-items-center rounded-full border-4 border-white bg-gradient-to-br from-[#C99A2E] to-[#C91F32] text-white shadow-[0_18px_45px_rgba(201,31,50,0.28)] sm:h-36 sm:w-36"
              >
                <motion.span
                  initial={reduceMotion ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.55, delay: 0.25 }}
                >
                  <FontAwesomeIcon icon={faCheck} className="h-14 sm:h-16" />
                </motion.span>
                {!reduceMotion && (
                  <span className="absolute inset-[-14px] animate-ping rounded-full border border-[#C91F32]/25 [animation-duration:1.8s]" aria-hidden="true" />
                )}
              </motion.div>

              <p className="mt-8 text-xs font-black uppercase tracking-[0.22em] text-[#A97814]">Payment Successful</p>
              <h1 className="mt-3 text-4xl font-black uppercase tracking-[-0.05em] text-[#B7192C] sm:text-6xl">Your Order Is Confirmed</h1>
              <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-[#645B52] sm:text-base">
                Thank you, {order.customerName}. Your payment was verified and your order has been sent to The Rolling Stove.
              </p>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[1.15fr_.85fr]">
            <section id="order-details" className="border-b border-[#EEE4D6] p-6 sm:p-9 lg:border-b-0 lg:border-r">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#EEE4D6] pb-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#A97814]">Order ID</p>
                  <h2 className="mt-2 text-2xl font-black uppercase text-[#171717] sm:text-3xl">{order.orderNumber}</h2>
                </div>
                <span className="rounded-full border border-[#B8DFC3] bg-[#EFFAF2] px-4 py-2 text-[10px] font-black uppercase tracking-wider text-[#187A38]">
                  Paid & Confirmed
                </span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <InfoCard icon={faReceipt} label="Payment ID" value={maskPaymentId(payment?.paymentId)} />
                <InfoCard icon={faShieldHalved} label="Amount Paid" value={money(payment?.amount ?? order.grandTotal)} accent />
                <InfoCard icon={order.orderMode === "dine_in" ? faUtensils : faClock} label={order.orderMode === "dine_in" ? "Dine-In Time" : "Pickup Time"} value={formatTime(order.requestedPickupAt)} />
                <InfoCard icon={faCoins} label="Earned TRS Coins" value={`${order.coinsEarned} Coins`} gold />
              </div>

              <div className="mt-7 rounded-2xl border border-[#F0E2BD] bg-[#FFF7E6] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8D6515]">Estimated Preparation</p>
                <p className="mt-2 text-xl font-black text-[#B7192C]">Ready around {formatTime(order.estimatedReadyAt)}</p>
              </div>

              <div className="mt-7">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-black uppercase">Order Summary</h3>
                  <span className="text-xs font-bold text-[#756C62]">{order.itemCount} item{order.itemCount === 1 ? "" : "s"}</span>
                </div>
                <div className="mt-4 divide-y divide-[#EEE5D9] rounded-2xl border border-[#EEE5D9] bg-[#FFFCF7] px-4 sm:px-5">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-4 py-4 text-sm">
                      <div>
                        <strong>{item.quantity} × {item.name}</strong>
                        {item.variantName && <p className="mt-1 text-xs text-[#786F65]">{item.variantName}</p>}
                      </div>
                      <strong>{money(item.lineTotal)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <aside className="bg-[#FFFCF7] p-6 sm:p-9">
              <h2 className="text-xl font-black uppercase">Payment Summary</h2>
              <div className="mt-5 space-y-4 text-sm">
                <PriceRow label="Subtotal" value={order.subtotal} />
                <PriceRow label="Taxes" value={order.taxTotal} />
                {order.discountTotal > 0 && <PriceRow label="Discount" value={-order.discountTotal} discount />}
                <div className="flex items-center justify-between border-t border-[#E8DDCD] pt-5 text-xl font-black">
                  <span>Amount Paid</span>
                  <span className="text-[#B7192C]">{money(payment?.amount ?? order.grandTotal)}</span>
                </div>
              </div>

              <div className="mt-8 grid gap-3">
                <a href="#order-details" className="grid min-h-12 grid-cols-[20px_1fr] items-center rounded-xl border border-[#DCCDB8] bg-white px-5 text-xs font-black uppercase tracking-wider text-[#25211E] transition hover:border-[#C91F32] hover:text-[#B7192C]">
                  <FontAwesomeIcon icon={faEye} className="h-4" /><span className="text-center">View Order</span>
                </a>
                <Link href={trackHref} className="grid min-h-12 grid-cols-[20px_1fr] items-center rounded-xl bg-[#C91F32] px-5 text-xs font-black uppercase tracking-wider text-white shadow-[0_12px_25px_rgba(201,31,50,0.2)] transition hover:bg-[#AE1728]">
                  <FontAwesomeIcon icon={faLocationArrow} className="h-4" /><span className="text-center">Track Order</span>
                </Link>
                <a href={invoiceHref} className="grid min-h-12 grid-cols-[20px_1fr] items-center rounded-xl border border-[#C91F32] bg-white px-5 text-xs font-black uppercase tracking-wider text-[#B7192C] transition hover:bg-[#FFF1F2]">
                  <FontAwesomeIcon icon={faDownload} className="h-4" /><span className="text-center">Download Invoice</span>
                </a>
                <Link href="/menu" className="grid min-h-12 grid-cols-[20px_1fr] items-center rounded-xl border border-[#C99A2E] bg-[#FFF8E9] px-5 text-xs font-black uppercase tracking-wider text-[#8A6112] transition hover:bg-[#FFF2D3]">
                  <FontAwesomeIcon icon={faArrowRotateRight} className="h-4" /><span className="text-center">Order Again</span>
                </Link>
              </div>

              <div className="mt-8 rounded-2xl border border-[#E9DDCC] bg-white p-5 text-xs leading-6 text-[#6A6158]">
                <FontAwesomeIcon icon={faShieldHalved} className="mr-2 text-[#B7192C]" />
                Your payment was securely handled by Razorpay. TRS does not store your card or UPI credentials.
              </div>
            </aside>
          </div>
        </motion.section>
      </div>
    </main>
  );
}

function InfoCard({
  icon,
  label,
  value,
  accent = false,
  gold = false,
}: {
  icon: typeof faReceipt;
  label: string;
  value: string;
  accent?: boolean;
  gold?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-5 ${gold ? "border-[#ECD9A7] bg-[#FFF8E5]" : accent ? "border-[#F0D1D5] bg-[#FFF3F4]" : "border-[#E9E0D4] bg-white"}`}>
      <div className="flex items-center gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${gold ? "bg-[#F2E2B7] text-[#93660E]" : "bg-[#FFF0F1] text-[#B7192C]"}`}>
          <FontAwesomeIcon icon={icon} className="h-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#81776C]">{label}</p>
          <p className={`mt-1 truncate text-sm font-black sm:text-base ${accent ? "text-[#B7192C]" : gold ? "text-[#8A6112]" : "text-[#1C1A18]"}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function PriceRow({ label, value, discount = false }: { label: string; value: number; discount?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${discount ? "text-[#187A38]" : ""}`}>
      <span>{label}</span>
      <strong>{value < 0 ? `-${money(Math.abs(value))}` : money(value)}</strong>
    </div>
  );
}
