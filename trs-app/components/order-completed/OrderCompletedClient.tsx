"use client";

import {
  faArrowRotateRight,
  faCheck,
  faCoins,
  faShareNodes,
  faUtensils,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type CompletedOrder = {
  id: string;
  orderNumber: string;
  orderMode: "dine_in" | "takeaway";
  status: "completed";
  amountPaid: number;
  coinsEarned: number;
  completedAt: string | null;
  itemCount: number;
  items: Array<{
    id: string;
    menuItemId: string;
    name: string;
    variantName: string;
    quantity: number;
  }>;
};

type ApiResponse = {
  success: boolean;
  message: string;
  data?: CompletedOrder;
};

type PageState = "loading" | "ready" | "error";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export function OrderCompletedClient() {
  const searchParams = useSearchParams();
  const reduceMotion = useReducedMotion();
  const orderReference = searchParams.get("order")?.trim() ?? "";
  const [state, setState] = useState<PageState>("loading");
  const [order, setOrder] = useState<CompletedOrder | null>(null);
  const [message, setMessage] = useState("");
  const [shareMessage, setShareMessage] = useState("");

  const loadOrder = useCallback(async () => {
    if (!orderReference) {
      setState("error");
      setMessage("No completed order was provided.");
      return;
    }

    setState("loading");
    setMessage("");

    try {
      const response = await fetch(
        `/api/v1/customer/orders/completed?order=${encodeURIComponent(orderReference)}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as ApiResponse;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.message || "Unable to load the completed order.");
      }

      setOrder(payload.data);
      setState("ready");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Unable to load the completed order.");
    }
  }, [orderReference]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOrder();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadOrder]);

  const completedTime = order?.completedAt
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(order.completedAt))
    : "Completed";

  const shareOrder = async () => {
    if (!order) return;

    const text = `I just enjoyed my meal from The Rolling Stove. Order ${order.orderNumber} is complete!`;
    const shareData = {
      title: "The Rolling Stove",
      text,
      url: window.location.origin,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareMessage("Shared successfully.");
      } else {
        await navigator.clipboard.writeText(`${text} ${window.location.origin}`);
        setShareMessage("Share message copied.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareMessage("Sharing is unavailable right now.");
    }
  };

  if (state === "loading") {
    return (
      <main className="min-h-[70vh] bg-[#fffaf0] px-4 py-16 sm:px-6">
        <div className="mx-auto flex min-h-[520px] w-full max-w-4xl items-center justify-center rounded-[2rem] border border-[#ead8b1] bg-white shadow-[0_24px_80px_rgba(94,49,17,0.10)]">
          <div className="text-center" role="status" aria-live="polite">
            <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-[#f2dccd] border-t-[#c8102e]" />
            <p className="mt-5 font-black uppercase tracking-[0.16em] text-[#6c3421]">Loading completed order</p>
          </div>
        </div>
      </main>
    );
  }

  if (state === "error" || !order) {
    return (
      <main className="min-h-[70vh] bg-[#fffaf0] px-4 py-16 sm:px-6">
        <section className="mx-auto max-w-2xl rounded-[2rem] border border-[#edc7bd] bg-white p-8 text-center shadow-[0_24px_80px_rgba(94,49,17,0.10)] sm:p-12">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#fff0ec] text-3xl text-[#c8102e]">
            <FontAwesomeIcon icon={faUtensils} />
          </div>
          <h1 className="mt-6 text-3xl font-black tracking-[-0.04em] text-[#5a2418]">Order completion unavailable</h1>
          <p className="mx-auto mt-4 max-w-lg leading-7 text-[#755c51]">{message}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void loadOrder()}
              className="rounded-full bg-[#c8102e] px-6 py-3 font-black text-white transition hover:bg-[#a80d25] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c8102e]/25"
            >
              Try Again
            </button>
            <Link
              href="/customer/orders"
              className="rounded-full border border-[#d9bd83] bg-[#fffaf0] px-6 py-3 font-black text-[#6c3421] transition hover:bg-[#fff3d6] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#d9bd83]/30"
            >
              View Orders
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[70vh] bg-[radial-gradient(circle_at_top,#fff5d9_0,#fffaf0_42%,#fff_100%)] px-4 py-12 sm:px-6 sm:py-16">
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="mx-auto w-full max-w-4xl overflow-hidden rounded-[2rem] border border-[#e5cf9f] bg-white shadow-[0_28px_90px_rgba(94,49,17,0.13)]"
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-[#fff8e7] via-white to-[#fff0eb] px-6 py-10 text-center sm:px-10 sm:py-14">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#d7a83d]/10 blur-2xl" />
          <motion.div
            initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 180, damping: 15, delay: 0.08 }}
            className="relative mx-auto grid h-28 w-28 place-items-center rounded-full border-4 border-white bg-[#c8102e] text-5xl text-white shadow-[0_18px_45px_rgba(200,16,46,0.28)]"
            aria-hidden="true"
          >
            <FontAwesomeIcon icon={faCheck} />
          </motion.div>

          <p className="mt-7 text-xs font-black uppercase tracking-[0.28em] text-[#b27b16]">Order Completed</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] text-[#5a2418] sm:text-5xl">Enjoy your meal!</h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#755c51]">
            Your {order.orderMode === "takeaway" ? "takeaway order has been collected" : "dine-in order has been served"}. Thank you for choosing The Rolling Stove.
          </p>
          <p className="mt-3 text-sm font-bold text-[#997255]">{order.orderNumber} · {completedTime}</p>
        </div>

        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[0.9fr_1.1fr] lg:p-10">
          <section className="rounded-[1.6rem] border border-[#ead8b1] bg-[#fffaf0] p-6 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#fff0c9] text-2xl text-[#b27b16]">
              <FontAwesomeIcon icon={faCoins} />
            </div>
            <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-[#9a6713]">Coins earned</p>
            <p className="mt-2 text-5xl font-black tracking-[-0.06em] text-[#5a2418]">{order.coinsEarned}</p>
            <p className="mt-2 text-sm leading-6 text-[#755c51]">TRS Coins have been added to your rewards wallet.</p>
          </section>

          <section className="rounded-[1.6rem] border border-[#efd3cb] bg-white p-6 shadow-[0_12px_35px_rgba(94,49,17,0.07)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c8102e]">Meal summary</p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#5a2418]">{order.itemCount} item{order.itemCount === 1 ? "" : "s"}</h2>
              </div>
              <p className="text-lg font-black text-[#5a2418]">{currency.format(order.amountPaid)}</p>
            </div>
            <div className="mt-5 space-y-3 border-t border-[#f1e4d5] pt-5">
              {order.items.slice(0, 4).map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4 text-sm">
                  <div>
                    <p className="font-bold text-[#5a2418]">{item.name}</p>
                    {item.variantName ? <p className="mt-0.5 text-[#8b7469]">{item.variantName}</p> : null}
                  </div>
                  <span className="shrink-0 font-black text-[#c8102e]">× {item.quantity}</span>
                </div>
              ))}
              {order.items.length > 4 ? (
                <p className="text-sm font-bold text-[#9a6713]">+ {order.items.length - 4} more item{order.items.length - 4 === 1 ? "" : "s"}</p>
              ) : null}
            </div>
          </section>
        </div>

        <div className="border-t border-[#f0dfc7] bg-[#fffdf8] px-6 py-7 sm:px-8 lg:px-10">
          <div className="grid gap-3 sm:grid-cols-3">
            <Link
              href={`/review?order=${encodeURIComponent(order.orderNumber)}`}
              className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-[#c8102e] px-6 py-3.5 font-black text-white transition hover:-translate-y-0.5 hover:bg-[#a80d25] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c8102e]/25"
            >
              <FontAwesomeIcon icon={faCheck} />
              Review Experience
            </Link>
            <Link
              href="/menu"
              className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full border border-[#d9bd83] bg-white px-6 py-3.5 font-black text-[#6c3421] transition hover:-translate-y-0.5 hover:bg-[#fff5dc] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#d9bd83]/30"
            >
              <FontAwesomeIcon icon={faArrowRotateRight} />
              Reorder
            </Link>
            <button
              type="button"
              onClick={() => void shareOrder()}
              className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full border border-[#d9bd83] bg-white px-6 py-3.5 font-black text-[#6c3421] transition hover:-translate-y-0.5 hover:bg-[#fff5dc] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#d9bd83]/30"
            >
              <FontAwesomeIcon icon={faShareNodes} />
              Share
            </button>
          </div>
          <p className="mt-4 min-h-6 text-center text-sm font-bold text-[#8a6653]" aria-live="polite">{shareMessage}</p>
        </div>
      </motion.section>
    </main>
  );
}
