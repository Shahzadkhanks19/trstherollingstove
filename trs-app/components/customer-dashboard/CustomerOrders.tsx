"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faBagShopping,
  faClock,
  faReceipt,
  faRotateRight,
  faUtensils,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import type { ApiEnvelope, CustomerOrder, OrdersResponse, OrderStatus } from "@/components/customer-dashboard/order-types";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const filters: Array<{ label: string; value: "all" | OrderStatus }> = [
  { label: "All", value: "all" },
  { label: "Active", value: "placed" },
  { label: "Preparing", value: "preparing" },
  { label: "Ready", value: "ready" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const activeStatuses = new Set<OrderStatus>(["placed", "accepted", "preparing", "ready"]);

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusClasses(status: OrderStatus) {
  if (status === "completed") return "bg-emerald-50 text-emerald-700";
  if (status === "cancelled" || status === "rejected") return "bg-red-50 text-red-700";
  if (status === "ready") return "bg-amber-50 text-amber-800";
  return "bg-blue-50 text-blue-700";
}

export function CustomerOrders() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [filter, setFilter] = useState<(typeof filters)[number]["value"]>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [reorderingId, setReorderingId] = useState("");
  const [notice, setNotice] = useState("");

  const apiStatus = useMemo(() => {
    if (filter === "all") return "";
    if (filter === "placed") return "active";
    return filter;
  }, [filter]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (apiStatus && apiStatus !== "active") params.set("status", apiStatus);
      const response = await fetch(`/api/v1/customer/orders?${params.toString()}`, { cache: "no-store" });
      const body = (await response.json()) as ApiEnvelope<OrdersResponse>;
      if (!response.ok) throw new Error(body.message || "Could not load orders.");
      const nextOrders = apiStatus === "active"
        ? body.data.orders.filter((order) => activeStatuses.has(order.status))
        : body.data.orders;
      setOrders(nextOrders);
      setPages(Math.max(body.data.pagination.pages, 1));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load orders.");
    } finally {
      setLoading(false);
    }
  }, [apiStatus, page]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadOrders();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadOrders]);

  useRealtimeRefresh({
    events: ["order.updated", "order.status_changed", "order.cancelled", "order.payment_updated", "payment.updated"],
    enabled: true,
    onEvent: loadOrders,
  });

  async function reorder(orderId: string) {
    setReorderingId(orderId);
    setNotice("");
    try {
      const response = await fetch(`/api/v1/customer/orders/${orderId}/reorder`, { method: "POST" });
      const body = (await response.json()) as ApiEnvelope<{ addedItems: number; unavailableItems: number }>;
      if (!response.ok) throw new Error(body.message || "Could not reorder these items.");
      setNotice(
        body.data.unavailableItems > 0
          ? `${body.data.addedItems} item(s) added. ${body.data.unavailableItems} unavailable item(s) were skipped.`
          : `${body.data.addedItems} item(s) added to your cart.`,
      );
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Could not reorder these items.");
    } finally {
      setReorderingId("");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-[#111] p-6 text-white md:p-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#D9A441]">Order history</p>
        <h1 className="mt-3 text-3xl font-black">My Orders</h1>
        <p className="mt-2 max-w-2xl text-white/65">Track preparation, review payment details, download invoices and quickly order your favourites again.</p>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Order filters">
        {filters.map((item) => (
          <button
            key={item.value}
            onClick={() => { setFilter(item.value); setPage(1); }}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-extrabold transition ${filter === item.value ? "bg-[#C8102E] text-white" : "bg-white text-black/60 hover:text-black"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {notice ? <div className="rounded-2xl border border-[#D9A441]/30 bg-[#D9A441]/10 p-4 font-semibold text-[#6E4A00]">{notice}</div> : null}
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-5 font-semibold text-red-700">{error}</div> : null}

      {loading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-48 animate-pulse rounded-3xl bg-white" />)}</div>
      ) : orders.length === 0 ? (
        <div className="rounded-3xl border border-black/5 bg-white p-10 text-center shadow-sm">
          <FontAwesomeIcon icon={faReceipt} className="text-4xl text-black/20" />
          <h2 className="mt-4 text-xl font-black">No matching orders</h2>
          <p className="mt-2 text-sm text-black/50">Your TRS orders will appear here after checkout.</p>
          <Link href="/menu" className="mt-5 inline-flex rounded-xl bg-[#C8102E] px-5 py-3 text-sm font-extrabold text-white">Browse menu</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <article key={order._id} className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-black">#{order.orderNumber}</h2>
                    <span className={`rounded-full px-3 py-1 text-xs font-extrabold capitalize ${statusClasses(order.status)}`}>{order.status}</span>
                  </div>
                  <p className="mt-2 text-sm text-black/50">{formatDate(order.createdAt)} · {order.orderMode === "dine_in" ? "Dine-in" : "Takeaway"}</p>
                </div>
                <p className="text-xl font-black">{money.format(order.grandTotal)}</p>
              </div>

              <div className="mt-5 grid gap-3 rounded-2xl bg-[#F7F2EC] p-4 sm:grid-cols-3">
                <div><p className="text-xs font-bold uppercase tracking-wider text-black/40">Items</p><p className="mt-1 font-black">{order.itemCount}</p></div>
                <div><p className="text-xs font-bold uppercase tracking-wider text-black/40">Payment</p><p className="mt-1 font-black capitalize">{order.paymentStatus}</p></div>
                <div><p className="text-xs font-bold uppercase tracking-wider text-black/40">Status</p><p className="mt-1 flex items-center gap-2 font-black capitalize"><FontAwesomeIcon icon={activeStatuses.has(order.status) ? faClock : order.orderMode === "takeaway" ? faBagShopping : faUtensils} />{order.status}</p></div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link href={`/customer-dashboard/orders/${order._id}`} className="inline-flex items-center gap-2 rounded-xl bg-[#111] px-4 py-3 text-sm font-extrabold text-white">View details <FontAwesomeIcon icon={faArrowRight} /></Link>
                {order.status === "completed" ? (
                  <button onClick={() => void reorder(order._id)} disabled={reorderingId === order._id} className="inline-flex items-center gap-2 rounded-xl border border-black/10 px-4 py-3 text-sm font-extrabold disabled:opacity-60"><FontAwesomeIcon icon={faRotateRight} />{reorderingId === order._id ? "Adding…" : "Reorder"}</button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      {pages > 1 ? (
        <div className="flex items-center justify-center gap-3">
          <button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-bold disabled:opacity-40">Previous</button>
          <span className="text-sm font-bold text-black/50">Page {page} of {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage((value) => Math.min(pages, value + 1))} className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-bold disabled:opacity-40">Next</button>
        </div>
      ) : null}
    </div>
  );
}
