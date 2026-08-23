"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowDown,
  faArrowUp,
  faChevronLeft,
  faChevronRight,
  faCircleExclamation,
  faClockRotateLeft,
  faDownload,
  faEye,
  faFilter,
  faIndianRupeeSign,
  faPrint,
  faReceipt,
  faRotate,
  faSearch,
  faTimes,
  faUtensils,
  faWallet,
} from "@fortawesome/free-solid-svg-icons";

import { PageHeader } from "@/components/admin/AdminPrimitives";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { buildOrderInvoicePrintUrl } from "@/lib/pos/print-links";
import type {
  AdminOrder,
  AdminOrderListPayload,
  AdminOrderStatus,
  AdminPaymentMethod,
  AdminPaymentStatus,
} from "@/types/adminOrders";

type ApiResponse<T> = { success: boolean; message: string; data: T };
type SortField = "createdAt" | "grandTotal" | "orderNumber" | "status" | "paymentStatus";
type SortOrder = "asc" | "desc";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});
const dateTime = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

const statusLabels: Record<AdminOrderStatus, string> = {
  placed: "Pending",
  accepted: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Rejected",
};

const statusTone: Record<AdminOrderStatus, string> = {
  placed: "bg-orange-50 text-orange-700 ring-orange-200",
  accepted: "bg-sky-50 text-sky-700 ring-sky-200",
  preparing: "bg-amber-50 text-amber-700 ring-amber-200",
  ready: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cancelled: "bg-red-50 text-red-700 ring-red-200",
  rejected: "bg-rose-50 text-rose-700 ring-rose-200",
};

const nextStatuses: Record<AdminOrderStatus, AdminOrderStatus[]> = {
  placed: ["accepted", "cancelled", "rejected"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["completed"],
  completed: [],
  cancelled: [],
  rejected: [],
};

const tabs: Array<{ value: "all" | AdminOrderStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "placed", label: "Pending" },
  { value: "accepted", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "ready", label: "Ready" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export function AdminOrdersClient({
  canManage,
  canManagePayments,
}: {
  canManage: boolean;
  canManagePayments: boolean;
}) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({ all: 0 });
  const [status, setStatus] = useState<"all" | AdminOrderStatus>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [orderMode, setOrderMode] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [acting, setActing] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      page: String(pagination.page),
      limit: String(pagination.limit),
      status,
      orderMode,
      paymentStatus,
      paymentMethod,
      sortBy,
      sortOrder,
    });
    if (search) params.set("search", search);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return params.toString();
  }, [pagination.page, pagination.limit, status, orderMode, paymentStatus, paymentMethod, sortBy, sortOrder, search, from, to]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/admin/orders?${query}`, { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<AdminOrderListPayload>;
      if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to load orders.");
      setOrders(payload.data.orders);
      setPagination(payload.data.pagination);
      setStatusCounts(payload.data.statusCounts);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load orders.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOrders();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadOrders]);

  useRealtimeRefresh({
    events: ["order.created", "order.updated", "order.status_changed", "order.cancelled", "order.payment_updated", "payment.updated"],
    onEvent: () => loadOrders(),
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPagination((current) => ({ ...current, page: 1 }));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  async function openOrder(orderId: string) {
    setDetailLoading(true);
    setActionError("");
    try {
      const response = await fetch(`/api/v1/admin/orders/${orderId}`, { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<AdminOrder>;
      if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to load order.");
      setSelectedOrder(payload.data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load order.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function updateStatus(statusValue: AdminOrderStatus, note: string) {
    if (!selectedOrder) return;
    setActing(true);
    setActionError("");
    try {
      const response = await fetch(`/api/v1/admin/orders/${selectedOrder._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusValue, note }),
      });
      const payload = (await response.json()) as ApiResponse<AdminOrder>;
      if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to update status.");
      setSelectedOrder(payload.data);
      await loadOrders();
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : "Unable to update status.");
    } finally {
      setActing(false);
    }
  }

  async function updatePayment(paymentStatusValue: AdminPaymentStatus, paymentMethodValue: AdminPaymentMethod) {
    if (!selectedOrder) return;
    setActing(true);
    setActionError("");
    try {
      const response = await fetch(`/api/v1/admin/orders/${selectedOrder._id}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: paymentStatusValue, paymentMethod: paymentMethodValue }),
      });
      const payload = (await response.json()) as ApiResponse<AdminOrder>;
      if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to update payment.");
      setSelectedOrder(payload.data);
      await loadOrders();
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : "Unable to update payment.");
    } finally {
      setActing(false);
    }
  }

  function changeSort(field: SortField) {
    if (field === sortBy) setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
    else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPagination((current) => ({ ...current, page: 1 }));
  }

  function resetFilters() {
    setSearchInput("");
    setSearch("");
    setOrderMode("all");
    setPaymentStatus("all");
    setPaymentMethod("all");
    setFrom("");
    setTo("");
    setStatus("all");
    setPagination((current) => ({ ...current, page: 1 }));
  }

  function exportRows(format: "csv" | "xls") {
    const headers = ["Order ID", "Date", "Customer", "Phone", "Mode", "Status", "Payment", "Method", "Items", "Total"];
    const rows = orders.map((order) => [
      order.orderNumber,
      dateTime.format(new Date(order.createdAt)),
      order.customerSnapshot.name,
      order.customerSnapshot.phone || "",
      order.orderMode,
      statusLabels[order.status],
      order.paymentStatus,
      order.paymentMethod,
      order.itemCount,
      order.grandTotal,
    ]);

    const separator = format === "csv" ? "," : "\t";
    const content = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(separator))
      .join("\n");
    const blob = new Blob([content], {
      type: format === "csv" ? "text/csv;charset=utf-8" : "application/vnd.ms-excel;charset=utf-8",
    });
    downloadBlob(blob, `trs-orders-${new Date().toISOString().slice(0, 10)}.${format}`);
  }

  return (
    <>
      <PageHeader
        eyebrow="Order operations"
        title="Orders Management"
        description="Search, filter, review and progress dine-in and takeaway orders through the complete fulfilment workflow."
        action={
          <div className="flex flex-wrap gap-2">
            <ActionButton icon={faDownload} label="CSV" onClick={() => exportRows("csv")} />
            <ActionButton icon={faDownload} label="Excel" onClick={() => exportRows("xls")} />
            <ActionButton icon={faPrint} label="PDF" onClick={() => window.print()} />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total filtered" value={statusCounts.all ?? pagination.total} icon={faReceipt} />
        <Metric label="Pending" value={statusCounts.placed ?? 0} icon={faClockRotateLeft} />
        <Metric label="Preparing" value={statusCounts.preparing ?? 0} icon={faUtensils} />
        <Metric label="Ready" value={statusCounts.ready ?? 0} icon={faCircleExclamation} />
      </div>

      <section className="mt-5 overflow-hidden rounded-[24px] border border-[#e8ddd3] bg-[#fffdf9] shadow-[0_10px_32px_rgba(30,35,40,.05)] print:shadow-none">
        <div className="border-b border-[#eee4dc] p-4 sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative min-w-0 flex-1 xl:max-w-xl">
              <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 h-4 -translate-y-1/2 text-[#9b8e84]" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search order ID, customer, phone or email"
                className="h-12 w-full rounded-2xl border border-[#ded2c8] bg-white pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-[#C8102E] focus:ring-4 focus:ring-[#C8102E]/10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setShowFilters((current) => !current)} className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#ded2c8] bg-white px-4 text-xs font-black text-[#183043]">
                <FontAwesomeIcon icon={faFilter} /> Filters
              </button>
              <button onClick={() => void loadOrders()} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#17384d] px-4 text-xs font-black text-white">
                <FontAwesomeIcon icon={faRotate} /> Refresh
              </button>
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setStatus(tab.value);
                  setPagination((current) => ({ ...current, page: 1 }));
                }}
                className={`shrink-0 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-wider transition ${status === tab.value ? "bg-[#C8102E] text-white" : "bg-[#f4ece6] text-[#776b63] hover:text-[#C8102E]"}`}
              >
                {tab.label} <span className="ml-1 opacity-75">{statusCounts[tab.value] ?? 0}</span>
              </button>
            ))}
          </div>

          <AnimatePresence initial={false}>
            {showFilters && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-4 grid gap-3 border-t border-[#eee4dc] pt-4 sm:grid-cols-2 xl:grid-cols-6">
                  <FilterSelect label="Order mode" value={orderMode} onChange={setOrderMode} options={["all", "dine_in", "takeaway"]} />
                  <FilterSelect label="Payment status" value={paymentStatus} onChange={setPaymentStatus} options={["all", "pending", "paid", "failed", "refunded"]} />
                  <FilterSelect label="Payment method" value={paymentMethod} onChange={setPaymentMethod} options={["all", "cash", "upi", "card", "online"]} />
                  <DateField label="From" value={from} onChange={setFrom} />
                  <DateField label="To" value={to} onChange={setTo} />
                  <button onClick={resetFilters} className="mt-auto h-11 rounded-xl border border-[#ded2c8] bg-white text-xs font-black text-[#C8102E]">Reset filters</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {error ? (
          <StatePanel icon={faCircleExclamation} title="Orders could not be loaded" message={error} action={() => void loadOrders()} />
        ) : loading ? (
          <OrdersSkeleton />
        ) : orders.length === 0 ? (
          <StatePanel icon={faReceipt} title="No orders found" message="Try changing the filters or search term." action={resetFilters} />
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1050px] text-left">
                <thead className="bg-[#fbf6f1] text-[9px] font-black uppercase tracking-[.16em] text-[#84776e]">
                  <tr>
                    <SortableHead label="Order" field="orderNumber" current={sortBy} direction={sortOrder} onSort={changeSort} />
                    <SortableHead label="Date" field="createdAt" current={sortBy} direction={sortOrder} onSort={changeSort} />
                    <th className="px-5 py-4">Customer</th>
                    <th className="px-5 py-4">Mode</th>
                    <SortableHead label="Status" field="status" current={sortBy} direction={sortOrder} onSort={changeSort} />
                    <SortableHead label="Payment" field="paymentStatus" current={sortBy} direction={sortOrder} onSort={changeSort} />
                    <SortableHead label="Total" field="grandTotal" current={sortBy} direction={sortOrder} onSort={changeSort} />
                    <th className="px-5 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eee4dc]">
                  {orders.map((order) => (
                    <tr key={order._id} className="transition hover:bg-[#fffaf6]">
                      <td className="px-5 py-4"><b className="text-sm text-[#173044]">{order.orderNumber}</b><p className="mt-1 text-[10px] font-semibold text-[#958980]">{order.itemCount} item{order.itemCount === 1 ? "" : "s"}</p></td>
                      <td className="px-5 py-4 text-xs font-semibold text-[#6f645d]">{dateTime.format(new Date(order.createdAt))}</td>
                      <td className="px-5 py-4"><p className="text-xs font-extrabold text-[#183043]">{order.customerSnapshot.name}</p><p className="mt-1 text-[10px] font-semibold text-[#958980]">{order.customerSnapshot.phone || order.customerSnapshot.email || "—"}</p></td>
                      <td className="px-5 py-4 text-xs font-bold capitalize text-[#6f645d]">{order.orderMode.replace("_", " ")}</td>
                      <td className="px-5 py-4"><StatusPill status={order.status} /></td>
                      <td className="px-5 py-4"><PaymentPill status={order.paymentStatus} method={order.paymentMethod} /></td>
                      <td className="px-5 py-4 text-sm font-black text-[#173044]">{money.format(order.grandTotal)}</td>
                      <td className="px-5 py-4 text-right"><button onClick={() => void openOrder(order._id)} className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#ded2c8] px-3 text-[10px] font-black text-[#173044] hover:border-[#C8102E] hover:text-[#C8102E]"><FontAwesomeIcon icon={faEye} /> View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-4 lg:hidden">
              {orders.map((order) => (
                <article key={order._id} className="rounded-2xl border border-[#e8ddd3] bg-white p-4">
                  <div className="flex items-start justify-between gap-3"><div><b className="text-sm text-[#173044]">{order.orderNumber}</b><p className="mt-1 text-[10px] font-semibold text-[#958980]">{dateTime.format(new Date(order.createdAt))}</p></div><StatusPill status={order.status} /></div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs"><Info label="Customer" value={order.customerSnapshot.name} /><Info label="Mode" value={order.orderMode.replace("_", " ")} /><Info label="Payment" value={`${order.paymentStatus} · ${order.paymentMethod}`} /><Info label="Total" value={money.format(order.grandTotal)} /></div>
                  <button onClick={() => void openOrder(order._id)} className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#17384d] text-[10px] font-black uppercase tracking-wider text-white"><FontAwesomeIcon icon={faEye} /> View order</button>
                </article>
              ))}
            </div>
          </>
        )}

        <div className="flex flex-col gap-3 border-t border-[#eee4dc] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-[11px] font-semibold text-[#83776e]">Showing {orders.length} of {pagination.total} orders</p>
          <div className="flex items-center gap-2">
            <button disabled={pagination.page <= 1 || loading} onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))} className="grid h-9 w-9 place-items-center rounded-xl border border-[#ded2c8] disabled:opacity-40"><FontAwesomeIcon icon={faChevronLeft} /></button>
            <span className="min-w-24 text-center text-xs font-black text-[#173044]">Page {pagination.page} / {Math.max(pagination.pages, 1)}</span>
            <button disabled={pagination.page >= pagination.pages || loading} onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))} className="grid h-9 w-9 place-items-center rounded-xl border border-[#ded2c8] disabled:opacity-40"><FontAwesomeIcon icon={faChevronRight} /></button>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {(selectedOrder || detailLoading) && (
          <OrderDrawer
            key={selectedOrder ? `${selectedOrder._id}-${selectedOrder.updatedAt}` : "loading"}
            order={selectedOrder}
            loading={detailLoading}
            canManage={canManage}
            canManagePayments={canManagePayments}
            acting={acting}
            actionError={actionError}
            onClose={() => setSelectedOrder(null)}
            onStatus={updateStatus}
            onPayment={updatePayment}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function OrderDrawer({ order, loading, canManage, canManagePayments, acting, actionError, onClose, onStatus, onPayment }: {
  order: AdminOrder | null;
  loading: boolean;
  canManage: boolean;
  canManagePayments: boolean;
  acting: boolean;
  actionError: string;
  onClose: () => void;
  onStatus: (status: AdminOrderStatus, note: string) => Promise<void>;
  onPayment: (status: AdminPaymentStatus, method: AdminPaymentMethod) => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<AdminPaymentStatus>(order?.paymentStatus ?? "pending");
  const [paymentMethod, setPaymentMethod] = useState<AdminPaymentMethod>(order?.paymentMethod ?? "cash");

  return (
    <div className="fixed inset-0 z-[140] flex justify-end bg-[#07131d]/55 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Order details">
      <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close order details" />
      <motion.aside initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 270 }} className="relative h-full w-full max-w-2xl overflow-y-auto bg-[#f7f1eb] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e5d9d0] bg-[#fffdf9]/95 px-5 py-4 backdrop-blur-xl">
          <div><p className="text-[9px] font-black uppercase tracking-[.2em] text-[#C8102E]">Order details</p><h2 className="mt-1 text-xl font-black text-[#173044]">{order?.orderNumber ?? "Loading…"}</h2></div>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-[#ded2c8] bg-white" aria-label="Close"><FontAwesomeIcon icon={faTimes} /></button>
        </div>

        {loading || !order ? <OrdersSkeleton compact /> : <div className="space-y-4 p-4 sm:p-5">
          {actionError && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700">{actionError}</div>}
          <div className="grid gap-3 sm:grid-cols-3"><MiniCard label="Order total" value={money.format(order.grandTotal)} icon={faIndianRupeeSign} /><MiniCard label="Items" value={String(order.itemCount)} icon={faUtensils} /><MiniCard label="Payment" value={order.paymentStatus} icon={faWallet} /></div>

          <DetailSection title="Customer information">
            <div className="grid gap-3 sm:grid-cols-2"><Info label="Name" value={order.customerSnapshot.name} /><Info label="Phone" value={order.customerSnapshot.phone || "—"} /><Info label="Email" value={order.customerSnapshot.email || "—"} /><Info label="Order mode" value={order.orderMode.replace("_", " ")} /></div>
            {order.tableNumber && <p className="mt-3 text-xs font-semibold text-[#6d625a]">Table: <b className="text-[#173044]">{order.tableNumber}</b></p>}
            {order.customerNote && <div className="mt-3 rounded-xl bg-[#fff7ef] p-3 text-xs leading-5 text-[#6d625a]"><b className="text-[#173044]">Customer note:</b> {order.customerNote}</div>}
          </DetailSection>

          <DetailSection title="Items and customisations">
            <div className="space-y-3">{order.items.map((item) => <div key={item._id} className="rounded-2xl border border-[#eee4dc] bg-white p-4"><div className="flex justify-between gap-4"><div><b className="text-sm text-[#173044]">{item.quantity} × {item.name}</b>{item.variantName && <p className="mt-1 text-[10px] font-bold text-[#8d8178]">Variant: {item.variantName}</p>}</div><b className="text-sm text-[#C8102E]">{money.format(item.lineTotal)}</b></div>{item.modifiers.length > 0 && <div className="mt-3 space-y-1">{item.modifiers.map((modifier, index) => <p key={`${modifier.groupName}-${index}`} className="text-[10px] font-semibold text-[#746961]">{modifier.groupName}: {modifier.optionName} (+{money.format(modifier.unitPrice)})</p>)}</div>}{item.specialInstructions && <p className="mt-3 rounded-xl bg-[#fff7ef] p-3 text-[10px] font-semibold leading-5 text-[#746961]">{item.specialInstructions}</p>}</div>)}</div>
          </DetailSection>

          <DetailSection title="Pricing breakdown"><PriceRow label="Subtotal" value={order.subtotal} /><PriceRow label="Tax" value={order.taxTotal} /><PriceRow label="Coupon discount" value={-order.couponDiscount} /><PriceRow label="TRS Coins discount" value={-order.coinDiscount} /><PriceRow label="Total discount" value={-order.discountTotal} /><div className="mt-3 flex justify-between border-t border-[#eee4dc] pt-3 text-base font-black text-[#173044]"><span>Grand total</span><span>{money.format(order.grandTotal)}</span></div>{order.couponCode && <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-[#C8102E]">Coupon: {order.couponCode}</p>}</DetailSection>

          {(order.tipAmount ?? 0) > 0 && <DetailSection title="Internal waiter-tip accounting"><PriceRow label="Restaurant sale after waiver" value={Math.max(0, order.grandTotal - (order.waivedAmount ?? 0))} />{order.tipCollection === "restaurant" ? <><PriceRow label={`${order.tipMethod === "upi" ? "UPI" : "Cash"} tip payable to ${order.orderTakerName || "waiter"}`} value={order.tipAmount ?? 0} /><div className="mt-3 flex justify-between border-t border-violet-200 bg-violet-50 p-3 text-sm font-black text-violet-950"><span>Total received by restaurant</span><span>{money.format(Math.max(0, order.grandTotal - (order.waivedAmount ?? 0)) + (order.tipAmount ?? 0))}</span></div><p className="mt-2 text-[10px] font-bold text-violet-700">The tip is a waiter payable and is excluded from restaurant revenue and the customer invoice.</p></> : <p className="rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800">Cash tip {money.format(order.tipAmount ?? 0)} was collected directly by {order.orderTakerName || "the waiter"}; it was not received by the restaurant.</p>}</DetailSection>}

          <DetailSection title="Order workflow"><div className="mb-4 flex flex-wrap gap-2"><StatusPill status={order.status} /><PaymentPill status={order.paymentStatus} method={order.paymentMethod} /></div>{canManage && nextStatuses[order.status].length > 0 && <div className="space-y-3"><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder={nextStatuses[order.status].some((value) => value === "cancelled" || value === "rejected") ? "Add a note or cancellation reason" : "Optional status note"} maxLength={500} className="min-h-24 w-full rounded-2xl border border-[#ded2c8] bg-white p-3 text-xs font-semibold outline-none focus:border-[#C8102E]" /><div className="flex flex-wrap gap-2">{nextStatuses[order.status].map((next) => <button key={next} disabled={acting || ((next === "cancelled" || next === "rejected") && note.trim().length < 3)} onClick={() => void onStatus(next, note)} className={`rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-40 ${next === "cancelled" || next === "rejected" ? "bg-red-600" : "bg-[#17384d]"}`}>{statusLabels[next]}</button>)}</div></div>}</DetailSection>

          {canManagePayments && <DetailSection title="Payment management"><div className="grid gap-3 sm:grid-cols-2"><FilterSelect label="Payment status" value={paymentStatus} onChange={(value) => setPaymentStatus(value as AdminPaymentStatus)} options={["pending", "paid", "failed", "refunded"]} /><FilterSelect label="Payment method" value={paymentMethod} onChange={(value) => setPaymentMethod(value as AdminPaymentMethod)} options={["cash", "upi", "card", "online"]} /></div><button disabled={acting || (paymentStatus === order.paymentStatus && paymentMethod === order.paymentMethod)} onClick={() => void onPayment(paymentStatus, paymentMethod)} className="mt-3 rounded-xl bg-[#C8102E] px-4 py-3 text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-40">Save payment changes</button></DetailSection>}

          <DetailSection title="Timeline"><div className="space-y-4">{[...order.statusHistory].reverse().map((item, index) => <div key={`${item.changedAt}-${index}`} className="relative pl-6 before:absolute before:left-[5px] before:top-5 before:h-[calc(100%+4px)] before:w-px before:bg-[#ded2c8] last:before:hidden"><span className="absolute left-0 top-1 h-3 w-3 rounded-full bg-[#C8102E] ring-4 ring-[#fff0e8]" /><div className="flex flex-wrap items-center justify-between gap-2"><b className="text-xs text-[#173044]">{statusLabels[item.status]}</b><span className="text-[9px] font-bold text-[#92867d]">{dateTime.format(new Date(item.changedAt))}</span></div>{item.note && <p className="mt-1 text-[10px] leading-5 text-[#746961]">{item.note}</p>}</div>)}</div></DetailSection>

          <div className="flex flex-wrap gap-2 pb-4"><button type="button" onClick={() => window.open(buildOrderInvoicePrintUrl(order._id), "_blank", "noopener,noreferrer")} className="inline-flex items-center gap-2 rounded-xl bg-[#17384d] px-4 py-3 text-[10px] font-black uppercase tracking-wider text-white"><FontAwesomeIcon icon={faPrint} /> Print receipt</button></div>
        </div>}
      </motion.aside>
    </div>
  );
}

function ActionButton({ icon, label, onClick }: { icon: typeof faDownload; label: string; onClick: () => void }) { return <button onClick={onClick} className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#dacec4] bg-white px-4 text-[10px] font-black uppercase tracking-wider text-[#173044]"><FontAwesomeIcon icon={icon} />{label}</button>; }
function Metric({ label, value, icon }: { label: string; value: number; icon: typeof faReceipt }) { return <div className="rounded-[22px] border border-[#e8ddd3] bg-[#fffdf9] p-5 shadow-[0_10px_32px_rgba(30,35,40,.055)]"><div className="flex items-start justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.17em] text-[#8a7e75]">{label}</p><p className="mt-3 text-3xl font-black text-[#173044]">{value}</p></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#fff0e8] text-[#C8102E]"><FontAwesomeIcon icon={icon} /></span></div></div>; }
function StatusPill({ status }: { status: AdminOrderStatus }) { return <span className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ring-1 ring-inset ${statusTone[status]}`}>{statusLabels[status]}</span>; }
function PaymentPill({ status, method }: { status: AdminPaymentStatus; method: AdminPaymentMethod }) { const tone = status === "paid" ? "bg-emerald-50 text-emerald-700" : status === "failed" ? "bg-red-50 text-red-700" : status === "refunded" ? "bg-purple-50 text-purple-700" : "bg-slate-100 text-slate-600"; return <span className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${tone}`}>{status} · {method}</span>; }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-[9px] font-black uppercase tracking-wider text-[#958980]">{label}</p><p className="mt-1 break-words text-xs font-extrabold capitalize text-[#173044]">{value}</p></div>; }
function DetailSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-[22px] border border-[#e8ddd3] bg-[#fffdf9] p-4 shadow-[0_8px_24px_rgba(30,35,40,.04)]"><h3 className="mb-4 text-sm font-black text-[#173044]">{title}</h3>{children}</section>; }
function MiniCard({ label, value, icon }: { label: string; value: string; icon: typeof faReceipt }) { return <div className="rounded-2xl border border-[#e8ddd3] bg-[#fffdf9] p-4"><FontAwesomeIcon icon={icon} className="h-4 text-[#C8102E]" /><p className="mt-3 text-[9px] font-black uppercase tracking-wider text-[#958980]">{label}</p><p className="mt-1 text-sm font-black capitalize text-[#173044]">{value}</p></div>; }
function PriceRow({ label, value }: { label: string; value: number }) { return <div className="flex justify-between py-1.5 text-xs font-semibold text-[#6d625a]"><span>{label}</span><span>{money.format(value)}</span></div>; }
function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) { return <label className="block"><span className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-[#8d8178]">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-[#ded2c8] bg-white px-3 text-xs font-bold capitalize text-[#173044] outline-none focus:border-[#C8102E]">{options.map((option) => <option key={option} value={option}>{option.replace("_", " ")}</option>)}</select></label>; }
function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block"><span className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-[#8d8178]">{label}</span><input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-[#ded2c8] bg-white px-3 text-xs font-bold text-[#173044] outline-none focus:border-[#C8102E]" /></label>; }
function SortableHead({ label, field, current, direction, onSort }: { label: string; field: SortField; current: SortField; direction: SortOrder; onSort: (field: SortField) => void }) { return <th className="px-5 py-4"><button onClick={() => onSort(field)} className="inline-flex items-center gap-2">{label}{current === field && <FontAwesomeIcon icon={direction === "asc" ? faArrowUp : faArrowDown} className="h-2.5" />}</button></th>; }
function StatePanel({ icon, title, message, action }: { icon: typeof faReceipt; title: string; message: string; action: () => void }) { return <div className="grid min-h-80 place-items-center p-6 text-center"><div><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#fff0e8] text-[#C8102E]"><FontAwesomeIcon icon={icon} /></span><h3 className="mt-4 text-base font-black text-[#173044]">{title}</h3><p className="mt-2 max-w-md text-xs leading-5 text-[#83776e]">{message}</p><button onClick={action} className="mt-4 rounded-xl bg-[#17384d] px-4 py-3 text-[10px] font-black uppercase tracking-wider text-white">Try again</button></div></div>; }
function OrdersSkeleton({ compact = false }: { compact?: boolean }) { return <div className={`animate-pulse space-y-3 p-5 ${compact ? "min-h-96" : "min-h-80"}`}>{Array.from({ length: compact ? 6 : 8 }).map((_, index) => <div key={index} className="h-16 rounded-2xl bg-[#eee4dc]" />)}</div>; }
function downloadBlob(blob: Blob, filename: string) { const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url); }
