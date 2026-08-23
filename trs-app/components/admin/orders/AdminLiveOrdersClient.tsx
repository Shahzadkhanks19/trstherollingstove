"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faBell,
  faChair,
  faCheck,
  faCircleExclamation,
  faClock,
  faIndianRupeeSign,
  faKitchenSet,
  faMotorcycle,
  faReceipt,
  faRotate,
  faStore,
  faTimes,
  faUtensils,
} from "@fortawesome/free-solid-svg-icons";

import { PageHeader } from "@/components/admin/AdminPrimitives";
import { CustomActionModal } from "@/components/admin/CustomActionModal";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import type {
  AdminOrder,
  AdminOrderListPayload,
  AdminOrderStatus,
} from "@/types/adminOrders";

type ApiResponse<T> = { success: boolean; message: string; data: T };
type LiveStatus = "placed" | "accepted" | "preparing" | "ready";
type CancelAction = { order: AdminOrder; status: "cancelled" | "rejected" } | null;

const LIVE_STATUSES: LiveStatus[] = ["placed", "accepted", "preparing", "ready"];

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const timeFormatter = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
});

const columns: Array<{
  status: LiveStatus;
  title: string;
  description: string;
  icon: IconDefinition;
  tone: string;
}> = [
  {
    status: "placed",
    title: "New Orders",
    description: "Waiting for confirmation",
    icon: faBell,
    tone: "bg-orange-50 text-orange-700 ring-orange-200",
  },
  {
    status: "accepted",
    title: "Confirmed",
    description: "Accepted and queued",
    icon: faReceipt,
    tone: "bg-sky-50 text-sky-700 ring-sky-200",
  },
  {
    status: "preparing",
    title: "Preparing",
    description: "Currently in the kitchen",
    icon: faKitchenSet,
    tone: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  {
    status: "ready",
    title: "Ready",
    description: "Waiting for handover",
    icon: faCheck,
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
];

const nextAction: Record<LiveStatus, { status: AdminOrderStatus; label: string }> = {
  placed: { status: "accepted", label: "Accept order" },
  accepted: { status: "preparing", label: "Start preparing" },
  preparing: { status: "ready", label: "Mark ready" },
  ready: { status: "completed", label: "Complete order" },
};

function elapsedLabel(dateValue: string, now: number) {
  const elapsedMinutes = Math.max(0, Math.floor((now - new Date(dateValue).getTime()) / 60_000));
  if (elapsedMinutes < 1) return "Just now";
  if (elapsedMinutes < 60) return `${elapsedMinutes} min ago`;
  const hours = Math.floor(elapsedMinutes / 60);
  const minutes = elapsedMinutes % 60;
  return `${hours}h ${minutes}m ago`;
}


function formatOrderModifiers(
  modifiers: Array<{ groupName: string; optionName: string }>,
): string[] {
  const grouped = new Map<string, { groupName: string; optionName: string; quantity: number }>();

  for (const modifier of modifiers) {
    const key = `${modifier.groupName.trim().toLowerCase()}::${modifier.optionName.trim().toLowerCase()}`;
    const existing = grouped.get(key);
    if (existing) existing.quantity += 1;
    else grouped.set(key, { ...modifier, quantity: 1 });
  }

  return [...grouped.values()].map(
    (modifier) => `${modifier.groupName}: ${modifier.optionName}${modifier.quantity > 1 ? ` ×${modifier.quantity}` : ""}`,
  );
}

function OrderCard({
  order,
  now,
  canManage,
  actingOrderId,
  onAdvance,
  onCancel,
  onAddTime,
}: {
  order: AdminOrder;
  now: number;
  canManage: boolean;
  actingOrderId: string;
  onAdvance: (order: AdminOrder) => void;
  onCancel: (order: AdminOrder, status: "cancelled" | "rejected") => void;
  onAddTime: (order: AdminOrder, minutes: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const action = nextAction[order.status as LiveStatus];
  const acting = actingOrderId === order._id;
  const isLate = now - new Date(order.createdAt).getTime() > 20 * 60_000 && order.status !== "ready";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="overflow-hidden rounded-[22px] border border-[#e7dcd2] bg-white shadow-[0_10px_28px_rgba(30,35,40,.06)]"
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-black text-[#173044]">#{order.orderNumber}</p>
              {order.isRunningOrder && <span className="rounded-full bg-violet-50 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-violet-700">Pay Later</span>}
            </div>
            <p className="mt-1 text-xs font-semibold text-[#766a61]">{order.customerSnapshot.name}</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${isLate ? "bg-red-50 text-red-700" : "bg-[#f4efe9] text-[#74685f]"}`}>
            {elapsedLabel(order.createdAt, now)}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] font-bold text-[#685e56]">
          <span className="flex items-center gap-2 rounded-xl bg-[#faf7f3] px-3 py-2">
            <FontAwesomeIcon icon={order.orderMode === "dine_in" ? faChair : faMotorcycle} className="text-[#C8102E]" />
            {order.orderMode === "dine_in" ? `Dine in${order.tableNumber ? ` · ${order.tableNumber}` : ""}` : "Takeaway"}
          </span>
          <span className="flex items-center gap-2 rounded-xl bg-[#faf7f3] px-3 py-2">
            <FontAwesomeIcon icon={faClock} className="text-[#C8102E]" />
            {timeFormatter.format(new Date(order.createdAt))}
          </span>
          <span className="flex items-center gap-2 rounded-xl bg-[#faf7f3] px-3 py-2">
            <FontAwesomeIcon icon={faUtensils} className="text-[#C8102E]" />
            {order.itemCount} item{order.itemCount === 1 ? "" : "s"}
          </span>
          <span className="flex items-center gap-2 rounded-xl bg-[#faf7f3] px-3 py-2">
            <FontAwesomeIcon icon={faIndianRupeeSign} className="text-[#C8102E]" />
            {money.format(order.grandTotal)}
          </span>
        </div>

        {canManage && order.status === "preparing" && <div className="mt-3 flex gap-2"><button type="button" onClick={()=>onAddTime(order,5)} className="rounded-xl bg-amber-50 px-3 py-2 text-[10px] font-black text-amber-800">+5 min</button><button type="button" onClick={()=>onAddTime(order,10)} className="rounded-xl bg-amber-50 px-3 py-2 text-[10px] font-black text-amber-800">+10 min</button>{order.estimatedReadyAt && <span className="rounded-xl bg-slate-100 px-3 py-2 text-[10px] font-black">ETA {timeFormatter.format(new Date(order.estimatedReadyAt))}</span>}</div>}

        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-3 flex w-full items-center justify-between rounded-xl border border-[#eadfd5] px-3 py-2 text-left text-[11px] font-black text-[#173044]"
          aria-expanded={expanded}
        >
          <span>{expanded ? "Hide order items" : "View order items"}</span>
          <FontAwesomeIcon icon={faArrowRight} className={`transition-transform ${expanded ? "rotate-90" : ""}`} />
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-2 border-t border-[#eee4dc] pt-3">
                <div className="rounded-xl bg-[#f8f4ef] p-3 text-[10px] font-bold text-[#5f554d]"><p>Customer: {order.customerSnapshot.name}</p>{order.customerSnapshot.phone && <p>Phone: {order.customerSnapshot.phone}</p>}{order.customerSnapshot.email && <p>Email: {order.customerSnapshot.email}</p>}{order.orderTakerName && <p>Order taker: {order.orderTakerName}</p>}<p>Payment: {order.paymentMethod} · {order.paymentStatus}</p>{(order.waivedAmount ?? 0) > 0 && <p>Waived: {money.format(order.waivedAmount ?? 0)} · {order.waivedReason}</p>}{(order.tipAmount ?? 0) > 0 && <p>Tip: {money.format(order.tipAmount ?? 0)} via {order.tipMethod}</p>}{order.paymentBreakdown?.map((part,index)=><p key={index}>{part.method.toUpperCase()}: {money.format(part.amount)}{part.reference ? ` · ${part.reference}` : ""}</p>)}</div>
                {order.items.map((item) => (
                  <div key={item._id} className="flex items-start justify-between gap-3 text-xs">
                    <div>
                      <p className="font-black text-[#173044]">{item.quantity} × {item.name}</p>
                      {(item.variantName || item.modifiers.length > 0) && (
                        <p className="mt-0.5 text-[10px] font-semibold text-[#81756c]">
                          {[item.variantName, ...formatOrderModifiers(item.modifiers)].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {item.specialInstructions && <p className="mt-1 text-[10px] font-bold text-[#C8102E]">Note: {item.specialInstructions}</p>}
                    </div>
                    <span className="shrink-0 font-black text-[#173044]">{money.format(item.lineTotal)}</span>
                  </div>
                ))}
                {order.customerNote && (
                  <div className="rounded-xl bg-[#fff6e9] px-3 py-2 text-[10px] font-bold text-[#7a5418]">
                    Customer note: {order.customerNote}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {canManage && !order.isRunningOrder && (
        <div className="border-t border-[#eee4dc] bg-[#fffdf9] p-3">
          <button
            type="button"
            disabled={acting}
            onClick={() => onAdvance(order)}
            className="min-h-11 w-full rounded-xl bg-[#173044] px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {acting ? "Updating…" : action.label}
          </button>
          {order.status === "placed" && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" disabled={acting} onClick={() => onCancel(order, "rejected")} className="min-h-10 rounded-xl border border-[#e5d9cf] bg-white text-[11px] font-black text-[#173044] disabled:opacity-50">Reject</button>
              <button type="button" disabled={acting} onClick={() => onCancel(order, "cancelled")} className="min-h-10 rounded-xl border border-red-200 bg-red-50 text-[11px] font-black text-red-700 disabled:opacity-50">Cancel</button>
            </div>
          )}
        </div>
      )}
      {order.isRunningOrder && (
        <div className="border-t border-violet-100 bg-violet-50 p-3 text-center text-[10px] font-black text-violet-800">
          Pay Later order · Manage payment and cart from POS Running Orders
        </div>
      )}
    </motion.article>
  );
}

export function AdminLiveOrdersClient({ canManage }: { canManage: boolean }) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actingOrderId, setActingOrderId] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [cancelAction, setCancelAction] = useState<CancelAction>(null);

  const loadOrders = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        status: "live",
        limit: "100",
        sortBy: "createdAt",
        sortOrder: "asc",
      });
      const response = await fetch(`/api/v1/admin/orders?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<AdminOrderListPayload>;
      if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to load live orders.");
      setOrders(payload.data.orders);
      setLastUpdatedAt(new Date());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load live orders.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => void loadOrders(), 0);
    const clockTimer = window.setInterval(() => setNow(Date.now()), 60_000);
    const liveRefreshTimer = window.setInterval(() => void loadOrders(true), 5_000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void loadOrders(true);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(clockTimer);
      window.clearInterval(liveRefreshTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadOrders]);

  useRealtimeRefresh({
    events: ["order.created", "order.updated", "order.status_changed", "order.cancelled", "order.payment_updated", "payment.updated"],
    onEvent: () => loadOrders(true),
  });

  const groupedOrders = useMemo(() => {
    return LIVE_STATUSES.reduce<Record<LiveStatus, AdminOrder[]>>(
      (result, status) => {
        result[status] = orders.filter((order) => order.status === status);
        return result;
      },
      { placed: [], accepted: [], preparing: [], ready: [] },
    );
  }, [orders]);

  async function updateStatus(order: AdminOrder, status: AdminOrderStatus, note = "", estimatedReadyAt?: string) {
    if (actingOrderId) return;
    setActingOrderId(order._id);
    setActionError("");

    try {
      const response = await fetch(`/api/v1/admin/orders/${order._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note, ...(estimatedReadyAt ? { estimatedReadyAt } : {}) }),
      });
      const payload = (await response.json()) as ApiResponse<AdminOrder>;
      if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to update order.");
      setOrders((current) => current.map((item) => item._id === order._id ? payload.data : item).filter((item) => LIVE_STATUSES.includes(item.status as LiveStatus)));
      setCancelAction(null);
      setLastUpdatedAt(new Date());
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : "Unable to update order.");
    } finally {
      setActingOrderId("");
    }
  }

  async function addPreparationTime(order: AdminOrder, minutes: number) {
    const base = order.estimatedReadyAt && new Date(order.estimatedReadyAt).getTime() > Date.now() ? new Date(order.estimatedReadyAt).getTime() : Date.now();
    await updateStatus(order, order.status, `Preparation time extended by ${minutes} minutes.`, new Date(base + minutes * 60000).toISOString());
  }

  const totalLive = orders.length;
  const takeawayCount = orders.filter((order) => order.orderMode === "takeaway").length;
  const dineInCount = totalLive - takeawayCount;

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Live Orders"
        description="Monitor every active order from placement to handover. The board updates instantly through the TRS realtime server."
        action={
          <button
            type="button"
            disabled={refreshing}
            onClick={() => void loadOrders(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#173044] px-5 text-xs font-black text-white disabled:opacity-60"
          >
            <FontAwesomeIcon icon={faRotate} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing…" : "Refresh now"}
          </button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Live orders", value: totalLive, icon: faReceipt },
          { label: "Dine in", value: dineInCount, icon: faStore },
          { label: "Takeaway", value: takeawayCount, icon: faMotorcycle },
          { label: "Ready now", value: groupedOrders.ready.length, icon: faCheck },
        ].map((item) => (
          <div key={item.label} className="rounded-[20px] border border-[#e7dcd2] bg-[#fffdf9] p-4 shadow-[0_8px_24px_rgba(30,35,40,.045)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.16em] text-[#83776e]">{item.label}</p>
                <p className="mt-2 text-2xl font-black text-[#173044]">{item.value}</p>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#fff0e8] text-[#C8102E]"><FontAwesomeIcon icon={item.icon} /></span>
            </div>
          </div>
        ))}
      </div>

      {(error || actionError) && (
        <div role="alert" className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <FontAwesomeIcon icon={faCircleExclamation} className="mt-0.5" />
          <span>{actionError || error}</span>
          <button type="button" onClick={() => { setError(""); setActionError(""); }} className="ml-auto" aria-label="Dismiss error"><FontAwesomeIcon icon={faTimes} /></button>
        </div>
      )}

      <div className="mb-3 flex items-center justify-between text-[10px] font-bold text-[#84786f]">
        <span>{canManage ? "Use the action buttons to move orders through the workflow." : "You have view-only access to live orders."}</span>
        <span>{lastUpdatedAt ? `Updated ${timeFormatter.format(lastUpdatedAt)}` : "Not updated yet"}</span>
      </div>

      {loading ? (
        <div className="grid min-h-72 place-items-center rounded-[24px] border border-[#e7dcd2] bg-[#fffdf9]">
          <div className="text-center"><FontAwesomeIcon icon={faRotate} className="animate-spin text-2xl text-[#C8102E]" /><p className="mt-3 text-sm font-black text-[#173044]">Loading live orders…</p></div>
        </div>
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2 min-[1800px]:grid-cols-4">
          {columns.map((column) => (
            <section key={column.status} className="overflow-hidden rounded-[24px] border border-[#e7dcd2] bg-[#f8f4ef]">
              <header className="border-b border-[#e7dcd2] bg-[#fffdf9] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`grid h-10 w-10 place-items-center rounded-xl ring-1 ${column.tone}`}><FontAwesomeIcon icon={column.icon} /></span>
                    <div><h2 className="text-sm font-black text-[#173044]">{column.title}</h2><p className="mt-0.5 text-[10px] font-semibold text-[#81756c]">{column.description}</p></div>
                  </div>
                  <span className="grid h-8 min-w-8 place-items-center rounded-full bg-[#173044] px-2 text-xs font-black text-white">{groupedOrders[column.status].length}</span>
                </div>
              </header>
              <div className="min-h-48 space-y-3 p-3 md:max-h-[calc(100vh-360px)] md:overflow-y-auto">
                <AnimatePresence mode="popLayout">
                  {groupedOrders[column.status].map((order) => (
                    <OrderCard key={order._id} order={order} now={now} canManage={canManage} actingOrderId={actingOrderId} onAdvance={(selected) => void updateStatus(selected, nextAction[selected.status as LiveStatus].status)} onCancel={(selected, status) => setCancelAction({ order: selected, status })} onAddTime={(selected, minutes) => void addPreparationTime(selected, minutes)} />
                  ))}
                </AnimatePresence>
                {groupedOrders[column.status].length === 0 && (
                  <div className="grid min-h-40 place-items-center rounded-2xl border border-dashed border-[#d9ccc1] bg-white/60 px-4 text-center">
                    <div><FontAwesomeIcon icon={column.icon} className="text-xl text-[#b4a79d]" /><p className="mt-2 text-xs font-black text-[#766a61]">No {column.title.toLowerCase()}</p></div>
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      <CustomActionModal
        open={Boolean(cancelAction)}
        title={cancelAction?.status === "rejected" ? "Reject this order?" : "Cancel this order?"}
        description={`This will remove ${cancelAction?.order.orderNumber ?? "the order"} from the live workflow. A reason is required for the audit history.`}
        confirmLabel={cancelAction?.status === "rejected" ? "Reject order" : "Cancel order"}
        tone="danger"
        loading={Boolean(cancelAction && actingOrderId === cancelAction.order._id)}
        inputLabel="Reason"
        inputPlaceholder="Enter a clear reason"
        inputRequired
        onClose={() => { if (!actingOrderId) setCancelAction(null); }}
        onConfirm={async (reason) => {
          if (!cancelAction) return;
          await updateStatus(cancelAction.order, cancelAction.status, reason);
        }}
      />
    </div>
  );
}
