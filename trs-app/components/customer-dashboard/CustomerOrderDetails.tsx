"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faCheck, faClock, faDownload, faReceipt, faRotateRight, faUtensils } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import type { ApiEnvelope, CustomerOrder, OrderStatus } from "@/components/customer-dashboard/order-types";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const stages: Array<{ status: OrderStatus; label: string }> = [
  { status: "placed", label: "Placed" },
  { status: "accepted", label: "Accepted" },
  { status: "preparing", label: "Preparing" },
  { status: "ready", label: "Ready" },
  { status: "completed", label: "Completed" },
];

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function CustomerOrderDetails({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [error, setError] = useState("");
  const [reordering, setReordering] = useState(false);
  const [notice, setNotice] = useState("");

  const loadOrder = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/customer/orders/${orderId}`, { cache: "no-store" });
      const body = (await response.json()) as ApiEnvelope<CustomerOrder>;
      if (!response.ok) throw new Error(body.message || "Could not load order.");
      setOrder(body.data);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load order.");
    }
  }, [orderId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadOrder();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadOrder]);

  useRealtimeRefresh({
    events: ["order.updated", "order.status_changed", "order.cancelled", "order.payment_updated", "payment.updated"],
    enabled: Boolean(order),
    onEvent: async (event) => {
      const eventOrderId = String(event.data.orderId ?? event.entityId ?? "");
      if (!order || eventOrderId === order._id || eventOrderId === order.orderNumber) await loadOrder();
    },
  });

  async function reorder() {
    setReordering(true);
    setNotice("");
    try {
      const response = await fetch(`/api/v1/customer/orders/${orderId}/reorder`, { method: "POST" });
      const body = (await response.json()) as ApiEnvelope<{ addedItems: number; unavailableItems: number }>;
      if (!response.ok) throw new Error(body.message || "Could not reorder.");
      setNotice(body.data.unavailableItems ? `${body.data.addedItems} item(s) added; ${body.data.unavailableItems} unavailable item(s) skipped.` : "Order added to your cart.");
      router.push("/cart");
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Could not reorder.");
    } finally {
      setReordering(false);
    }
  }

  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 font-semibold text-red-700">{error}</div>;
  if (!order) return <div className="space-y-4"><div className="h-32 animate-pulse rounded-3xl bg-white" /><div className="h-96 animate-pulse rounded-3xl bg-white" /></div>;

  const currentIndex = stages.findIndex((stage) => stage.status === order.status);
  const terminalFailure = order.status === "cancelled" || order.status === "rejected";

  return (
    <div className="space-y-6">
      <Link href="/customer-dashboard/orders" className="inline-flex items-center gap-2 text-sm font-extrabold text-black/60 hover:text-black"><FontAwesomeIcon icon={faArrowLeft} />Back to orders</Link>

      <section className="rounded-3xl bg-[#111] p-6 text-white md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#D9A441]">Order details</p><h1 className="mt-3 text-3xl font-black">#{order.orderNumber}</h1><p className="mt-2 text-white/60">Placed {formatDate(order.createdAt)}</p></div>
          <div className="rounded-2xl bg-white/10 px-5 py-4"><p className="text-xs font-bold uppercase tracking-wider text-white/50">Total</p><p className="mt-1 text-2xl font-black">{money.format(order.grandTotal)}</p></div>
        </div>
      </section>

      {notice ? <div className="rounded-2xl border border-[#D9A441]/30 bg-[#D9A441]/10 p-4 font-semibold text-[#6E4A00]">{notice}</div> : null}

      <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm md:p-7">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#C8102E]/10 text-[#C8102E]"><FontAwesomeIcon icon={faClock} /></span><div><h2 className="text-xl font-black">Order progress</h2><p className="text-sm text-black/50">Live preparation timeline</p></div></div>
        {terminalFailure ? (
          <div className="mt-6 rounded-2xl bg-red-50 p-5 text-red-700"><p className="font-black capitalize">Order {order.status}</p><p className="mt-1 text-sm">{order.cancellationReason || "This order is no longer active."}</p></div>
        ) : (
          <div className="mt-7 grid gap-4 md:grid-cols-5">
            {stages.map((stage, index) => {
              const complete = index <= currentIndex;
              const history = order.statusHistory.find((item) => item.status === stage.status);
              return <div key={stage.status} className={`rounded-2xl border p-4 ${complete ? "border-[#C8102E]/25 bg-[#C8102E]/5" : "border-black/5 bg-[#F7F2EC]"}`}><span className={`grid h-9 w-9 place-items-center rounded-full ${complete ? "bg-[#C8102E] text-white" : "bg-black/10 text-black/40"}`}><FontAwesomeIcon icon={complete ? faCheck : faClock} /></span><p className="mt-3 font-black">{stage.label}</p><p className="mt-1 text-xs text-black/45">{history ? formatDate(history.changedAt) : "Pending"}</p></div>;
            })}
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm md:p-7">
          <h2 className="text-xl font-black">Items</h2>
          <div className="mt-5 divide-y divide-black/5">
            {order.items.map((item) => (
              <div key={item._id} className="flex gap-4 py-5 first:pt-0 last:pb-0">
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[#F7F2EC] text-black/30"><FontAwesomeIcon icon={faUtensils} /></div>
                <div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><div><p className="font-black">{item.name}</p>{item.variantName ? <p className="mt-1 text-sm text-black/50">{item.variantName}</p> : null}</div><p className="font-black">{money.format(item.lineTotal)}</p></div>{item.modifiers.length ? <p className="mt-2 text-xs text-black/50">{item.modifiers.map((modifier) => modifier.optionName).join(", ")}</p> : null}{item.specialInstructions ? <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{item.specialInstructions}</p> : null}<p className="mt-2 text-sm font-bold text-black/50">Qty {item.quantity} × {money.format(item.lineUnitPrice)}</p></div>
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm md:p-7">
            <h2 className="text-xl font-black">Payment summary</h2>
            <div className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><span className="text-black/50">Subtotal</span><strong>{money.format(order.subtotal)}</strong></div><div className="flex justify-between"><span className="text-black/50">Tax</span><strong>{money.format(order.taxTotal)}</strong></div>{order.discountTotal > 0 ? <div className="flex justify-between text-emerald-700"><span>Discounts</span><strong>-{money.format(order.discountTotal)}</strong></div> : null}{(order.packingCharge ?? 0) > 0 ? <div className="flex justify-between"><span className="text-black/50">Packing</span><strong>{money.format(order.packingCharge ?? 0)}</strong></div> : null}<div className="border-t border-black/10 pt-3"><div className="flex justify-between text-lg"><span className="font-black">Total</span><strong>{money.format(order.grandTotal)}</strong></div><p className="mt-2 text-xs font-bold uppercase tracking-wider text-black/40">{order.paymentStatus} · {order.paymentMethod}</p></div></div>
          </section>

          <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm md:p-7">
            <h2 className="text-xl font-black">Order actions</h2>
            <div className="mt-4 grid gap-3"><a href={`/api/v1/customer/orders/${order._id}/invoice?download=true`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 px-4 py-3 text-sm font-extrabold"><FontAwesomeIcon icon={faDownload} />Download invoice</a>{order.status === "completed" ? <button onClick={() => void reorder()} disabled={reordering} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#C8102E] px-4 py-3 text-sm font-extrabold text-white disabled:opacity-60"><FontAwesomeIcon icon={faRotateRight} />{reordering ? "Adding…" : "Reorder"}</button> : null}<Link href="/track-order" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#111] px-4 py-3 text-sm font-extrabold text-white"><FontAwesomeIcon icon={faReceipt} />Open public tracker</Link></div>
          </section>
        </div>
      </div>
    </div>
  );
}
