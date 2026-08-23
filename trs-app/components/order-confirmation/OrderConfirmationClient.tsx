"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRotateRight,
  faCheck,
  faClock,
  faFireBurner,
  faHashtag,
  faLocationArrow,
  faReceipt,
  faSpinner,
  faUtensils,
} from "@fortawesome/free-solid-svg-icons";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

type ConfirmationData = {
  order: {
    id: string;
    orderNumber: string;
    orderMode: "dine_in" | "takeaway";
    requestedPickupAt?: string | null;
    estimatedReadyAt?: string | null;
    status: "placed" | "accepted" | "preparing" | "ready" | "completed" | "cancelled" | "rejected";
    paymentStatus: string;
    itemCount: number;
    grandTotal: number;
    queueNumber: number;
    isInKitchen: boolean;
    createdAt: string;
  };
};

type LoadState = "loading" | "ready" | "error";

const STATUS_CONTENT: Record<ConfirmationData["order"]["status"], { label: string; detail: string }> = {
  placed: {
    label: "Sent to Kitchen",
    detail: "Your paid order has been received and is waiting for kitchen acceptance.",
  },
  accepted: {
    label: "Order Accepted",
    detail: "The kitchen has accepted your order and will begin preparation shortly.",
  },
  preparing: {
    label: "Preparing Now",
    detail: "Your food is currently being prepared by the kitchen team.",
  },
  ready: {
    label: "Ready for You",
    detail: "Your order is ready for pickup or service.",
  },
  completed: {
    label: "Order Completed",
    detail: "This order has been completed. Thank you for choosing TRS.",
  },
  cancelled: {
    label: "Order Cancelled",
    detail: "This order has been cancelled. Contact support if you need assistance.",
  },
  rejected: {
    label: "Order Not Accepted",
    detail: "The kitchen could not accept this order. Contact support for assistance.",
  },
};

function formatTime(value?: string | null) {
  if (!value) return "Being calculated";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function OrderConfirmationClient() {
  const reduceMotion = useReducedMotion();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [data, setData] = useState<ConfirmationData | null>(null);
  const [message, setMessage] = useState("Confirming your kitchen order…");

  const orderNumber = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("order")?.trim() ?? "";
  }, []);

  const loadOrder = useCallback(async () => {
    if (!orderNumber) {
      setLoadState("error");
      setMessage("We could not find an order number for this confirmation.");
      return;
    }

    try {
      setLoadState("loading");
      const response = await fetch(
        `/api/v1/customer/orders/confirmation?order=${encodeURIComponent(orderNumber)}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as ApiEnvelope<ConfirmationData>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Unable to load your order confirmation.");
      }
      setData(payload.data);
      setLoadState("ready");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load your order confirmation.");
      setLoadState("error");
    }
  }, [orderNumber]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadOrder(), 0);
    return () => window.clearTimeout(timer);
  }, [loadOrder]);

  useRealtimeRefresh({
    events: ["order.updated", "order.status_changed", "order.cancelled", "order.payment_updated", "payment.updated"],
    enabled: Boolean(orderNumber),
    onEvent: (event) => {
      const eventOrder = String(event.data.orderNumber ?? event.data.orderId ?? "");
      if (!data || eventOrder === data.order.orderNumber || eventOrder === data.order.id) return loadOrder();
    },
  });

  if (loadState === "loading") {
    return (
      <main className="grid min-h-[72vh] place-items-center bg-[#FFF9EF] px-4 py-16">
        <div className="w-full max-w-md rounded-[2rem] border border-[#E8DCC9] bg-white p-10 text-center shadow-[0_24px_65px_rgba(75,48,30,0.10)]">
          <FontAwesomeIcon icon={faSpinner} className="h-10 animate-spin text-[#C91F32]" aria-hidden="true" />
          <h1 className="mt-6 text-2xl font-black text-[#291F1A]">Loading Order Confirmation</h1>
          <p className="mt-3 text-sm leading-6 text-[#75675D]">{message}</p>
        </div>
      </main>
    );
  }

  if (loadState === "error" || !data) {
    return (
      <main className="grid min-h-[72vh] place-items-center bg-[#FFF9EF] px-4 py-16">
        <div className="w-full max-w-lg rounded-[2rem] border border-[#E8DCC9] bg-white p-8 text-center shadow-[0_24px_65px_rgba(75,48,30,0.10)] sm:p-10">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#FFF0F1] text-[#C91F32]">
            <FontAwesomeIcon icon={faReceipt} className="h-7" aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-2xl font-black text-[#291F1A]">Confirmation Not Available</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#75675D]">{message}</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => void loadOrder()} className="min-h-12 rounded-xl bg-[#C91F32] px-5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-[#AE1728] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C91F32] focus-visible:ring-offset-2">
              <FontAwesomeIcon icon={faArrowRotateRight} className="mr-2 h-4" /> Retry
            </button>
            <Link href="/customer/orders" className="grid min-h-12 place-items-center rounded-xl border border-[#C91F32] px-5 text-xs font-black uppercase tracking-wider text-[#B7192C] transition hover:bg-[#FFF1F2]">
              View My Orders
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { order } = data;
  const statusContent = STATUS_CONTENT[order.status];
  const trackHref = `/track-order?order=${encodeURIComponent(order.orderNumber)}`;

  return (
    <main className="min-h-screen bg-[#FFF9EF] px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="overflow-hidden rounded-[2rem] border border-[#E7D9C4] bg-white shadow-[0_28px_80px_rgba(75,48,30,0.12)]"
        >
          <div className="border-b border-[#ECDDC8] bg-gradient-to-br from-[#FFF8EA] via-[#FFFDF8] to-[#FFF0F1] px-6 py-10 text-center sm:px-10 sm:py-12">
            <motion.div
              initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 190, damping: 15 }}
              className="mx-auto grid h-24 w-24 place-items-center rounded-full border-4 border-white bg-[#C91F32] text-white shadow-[0_16px_40px_rgba(201,31,50,0.25)]"
            >
              <FontAwesomeIcon icon={faCheck} className="h-10" aria-hidden="true" />
            </motion.div>
            <p className="mt-6 text-xs font-black uppercase tracking-[0.24em] text-[#9A6A18]">Kitchen Confirmation</p>
            <h1 className="mt-2 text-3xl font-black text-[#291F1A] sm:text-4xl">Order Accepted</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#75675D] sm:text-base">
              Your paid order has reached the TRS kitchen. We’ll keep the status updated as it is prepared.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#E5C989] bg-[#FFF8E7] px-4 py-2 text-xs font-black uppercase tracking-wider text-[#81590D]">
              <FontAwesomeIcon icon={faReceipt} className="h-4" /> {order.orderNumber}
            </div>
          </div>

          <div className="grid gap-5 p-6 sm:grid-cols-2 sm:p-10 lg:grid-cols-4">
            <article className="rounded-2xl border border-[#E8DCC9] bg-[#FFFDF8] p-5">
              <div className="flex items-center gap-3 text-[#C91F32]">
                <FontAwesomeIcon icon={faClock} className="h-5" />
                <h2 className="text-xs font-black uppercase tracking-wider">Estimated Ready</h2>
              </div>
              <p className="mt-4 text-2xl font-black text-[#291F1A]">{formatTime(order.estimatedReadyAt)}</p>
              <p className="mt-2 text-xs leading-5 text-[#7B6D62]">The estimate may update if the kitchen is especially busy.</p>
            </article>

            <article className="rounded-2xl border border-[#E8DCC9] bg-[#FFFDF8] p-5">
              <div className="flex items-center gap-3 text-[#9A6A18]">
                <FontAwesomeIcon icon={faHashtag} className="h-5" />
                <h2 className="text-xs font-black uppercase tracking-wider">Queue Number</h2>
              </div>
              <p className="mt-4 text-3xl font-black text-[#291F1A]">{String(order.queueNumber).padStart(2, "0")}</p>
              <p className="mt-2 text-xs leading-5 text-[#7B6D62]">Today’s paid-order sequence at TRS.</p>
            </article>

            <article className="rounded-2xl border border-[#E8DCC9] bg-[#FFFDF8] p-5 sm:col-span-2">
              <div className="flex items-center gap-3 text-[#C91F32]">
                <FontAwesomeIcon icon={faFireBurner} className="h-5" />
                <h2 className="text-xs font-black uppercase tracking-wider">Kitchen Status</h2>
              </div>
              <div className="mt-4 flex items-start gap-4">
                <span className="relative mt-1 flex h-3 w-3 shrink-0">
                  {order.status !== "completed" && order.status !== "cancelled" && order.status !== "rejected" ? (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#C91F32] opacity-30" />
                  ) : null}
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-[#C91F32]" />
                </span>
                <div>
                  <p className="text-xl font-black text-[#291F1A]">{statusContent.label}</p>
                  <p className="mt-2 text-sm leading-6 text-[#75675D]">{statusContent.detail}</p>
                </div>
              </div>
            </article>
          </div>

          <div className="border-t border-[#ECDDC8] bg-[#FFFDF8] px-6 py-7 sm:px-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 text-sm text-[#6F6258]">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#FFF0F1] text-[#C91F32]">
                  <FontAwesomeIcon icon={order.orderMode === "dine_in" ? faUtensils : faClock} className="h-4" />
                </span>
                <div>
                  <p className="font-black text-[#291F1A]">{order.orderMode === "dine_in" ? "Dine-In Order" : "Pickup Order"}</p>
                  <p>{order.itemCount} item{order.itemCount === 1 ? "" : "s"} confirmed</p>
                </div>
              </div>

              <Link href={trackHref} className="grid min-h-14 grid-cols-[20px_1fr] items-center rounded-xl bg-[#C91F32] px-7 text-sm font-black uppercase tracking-wider text-white shadow-[0_14px_30px_rgba(201,31,50,0.22)] transition hover:-translate-y-0.5 hover:bg-[#AE1728] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C91F32] focus-visible:ring-offset-2 sm:min-w-56">
                <FontAwesomeIcon icon={faLocationArrow} className="h-4" />
                <span className="text-center">Track Order</span>
              </Link>
            </div>
          </div>
        </motion.section>
      </div>
    </main>
  );
}
