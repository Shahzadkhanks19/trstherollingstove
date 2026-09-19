"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleExclamation,
  faClockRotateLeft,
  faDownload,
  faFilter,
  faPrint,
  faReceipt,
  faRotate,
  faSearch,
  faUtensils,
} from "@fortawesome/free-solid-svg-icons";

import { PageHeader } from "@/components/admin/AdminPrimitives";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import type {
  AdminOrder,
  AdminOrderStatus,
  AdminPaymentMethod,
  AdminPaymentStatus,
} from "@/types/adminOrders";

import { dateTime, fetchAdminOrder, fetchAdminOrders, money, patchAdminOrderPayment, patchAdminOrderStatus, statusLabels, tabs, type SortField, type SortOrder } from "@/components/admin/orders/admin-orders.api";
import { OrderDrawer } from "@/components/admin/orders/OrderDrawer";
import { DateField, FilterSelect, OrdersSkeleton, StatePanel } from "@/components/admin/orders/AdminOrdersUi";
import { AdminOrdersList } from "@/components/admin/orders/AdminOrdersList";
export function AdminOrdersClient({
  canManage,
  canManagePayments,
}: {
  canManage: boolean;
  canManagePayments: boolean;
}) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({
    all: 0,
  });
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
  }, [
    pagination.page,
    pagination.limit,
    status,
    orderMode,
    paymentStatus,
    paymentMethod,
    sortBy,
    sortOrder,
    search,
    from,
    to,
  ]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAdminOrders(query);
      setOrders(data.orders);
      setPagination(data.pagination);
      setStatusCounts(data.statusCounts);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load orders.",
      );
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
    events: [
      "order.created",
      "order.updated",
      "order.status_changed",
      "order.cancelled",
      "order.payment_updated",
      "payment.updated",
    ],
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
      const order = await fetchAdminOrder(orderId);
      setSelectedOrder(order);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load order.",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  async function updateStatus(statusValue: AdminOrderStatus, note: string) {
    if (!selectedOrder) return;
    setActing(true);
    setActionError("");
    try {
      const order = await patchAdminOrderStatus(selectedOrder._id, statusValue, note);
      setSelectedOrder(order);
      await loadOrders();
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update status.",
      );
    } finally {
      setActing(false);
    }
  }

  async function updatePayment(
    paymentStatusValue: AdminPaymentStatus,
    paymentMethodValue: AdminPaymentMethod,
  ) {
    if (!selectedOrder) return;
    setActing(true);
    setActionError("");
    try {
      const order = await patchAdminOrderPayment(selectedOrder._id, paymentStatusValue, paymentMethodValue, "");
      setSelectedOrder(order);
      await loadOrders();
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update payment.",
      );
    } finally {
      setActing(false);
    }
  }

  function changeSort(field: SortField) {
    if (field === sortBy)
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
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
    const headers = [
      "Order ID",
      "Date",
      "Customer",
      "Phone",
      "Mode",
      "Status",
      "Payment",
      "Method",
      "Items",
      "Total",
    ];
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
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(separator),
      )
      .join("\n");
    const blob = new Blob([content], {
      type:
        format === "csv"
          ? "text/csv;charset=utf-8"
          : "application/vnd.ms-excel;charset=utf-8",
    });
    downloadBlob(
      blob,
      `trs-orders-${new Date().toISOString().slice(0, 10)}.${format}`,
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Order operations"
        title="Orders Management"
        description="Search, filter, review and progress dine-in and takeaway orders through the complete fulfilment workflow."
        action={
          <div className="flex flex-wrap gap-2">
            <ActionButton
              icon={faDownload}
              label="CSV"
              onClick={() => exportRows("csv")}
            />
            <ActionButton
              icon={faDownload}
              label="Excel"
              onClick={() => exportRows("xls")}
            />
            <ActionButton
              icon={faPrint}
              label="PDF"
              onClick={() => window.print()}
            />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Total filtered"
          value={statusCounts.all ?? pagination.total}
          icon={faReceipt}
        />
        <Metric
          label="Pending"
          value={statusCounts.placed ?? 0}
          icon={faClockRotateLeft}
        />
        <Metric
          label="Preparing"
          value={statusCounts.preparing ?? 0}
          icon={faUtensils}
        />
        <Metric
          label="Ready"
          value={statusCounts.ready ?? 0}
          icon={faCircleExclamation}
        />
      </div>

      <section className="mt-5 overflow-hidden rounded-[24px] border border-[#e8ddd3] bg-[#fffdf9] shadow-[0_10px_32px_rgba(30,35,40,.05)] print:shadow-none">
        <div className="border-b border-[#eee4dc] p-4 sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative min-w-0 flex-1 xl:max-w-xl">
              <FontAwesomeIcon
                icon={faSearch}
                className="absolute left-4 top-1/2 h-4 -translate-y-1/2 text-[#9b8e84]"
              />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search order ID, customer, phone or email"
                className="h-12 w-full rounded-2xl border border-[#ded2c8] bg-white pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-[#C8102E] focus:ring-4 focus:ring-[#C8102E]/10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowFilters((current) => !current)}
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#ded2c8] bg-white px-4 text-xs font-black text-[#183043]"
              >
                <FontAwesomeIcon icon={faFilter} /> Filters
              </button>
              <button
                onClick={() => void loadOrders()}
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#17384d] px-4 text-xs font-black text-white"
              >
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
                {tab.label}{" "}
                <span className="ml-1 opacity-75">
                  {statusCounts[tab.value] ?? 0}
                </span>
              </button>
            ))}
          </div>

          <AnimatePresence initial={false}>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 grid gap-3 border-t border-[#eee4dc] pt-4 sm:grid-cols-2 xl:grid-cols-6">
                  <FilterSelect
                    label="Order mode"
                    value={orderMode}
                    onChange={setOrderMode}
                    options={["all", "dine_in", "takeaway"]}
                  />
                  <FilterSelect
                    label="Payment status"
                    value={paymentStatus}
                    onChange={setPaymentStatus}
                    options={["all", "pending", "paid", "failed", "refunded"]}
                  />
                  <FilterSelect
                    label="Payment method"
                    value={paymentMethod}
                    onChange={setPaymentMethod}
                    options={["all", "cash", "upi", "card", "online"]}
                  />
                  <DateField label="From" value={from} onChange={setFrom} />
                  <DateField label="To" value={to} onChange={setTo} />
                  <button
                    onClick={resetFilters}
                    className="mt-auto h-11 rounded-xl border border-[#ded2c8] bg-white text-xs font-black text-[#C8102E]"
                  >
                    Reset filters
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {error ? (
          <StatePanel
            icon={faCircleExclamation}
            title="Orders could not be loaded"
            message={error}
            action={() => void loadOrders()}
          />
        ) : loading ? (
          <OrdersSkeleton />
        ) : orders.length === 0 ? (
          <StatePanel
            icon={faReceipt}
            title="No orders found"
            message="Try changing the filters or search term."
            action={resetFilters}
          />
        ) : (
          <>
            <AdminOrdersList
              orders={orders}
              pagination={pagination}
              loading={loading}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={changeSort}
              onOpen={(id) => void openOrder(id)}
              onPageChange={(page) => setPagination((current) => ({ ...current, page }))}
            />
          </>
        )}

      </section>

      <AnimatePresence>
        {(selectedOrder || detailLoading) && (
          <OrderDrawer
            key={
              selectedOrder
                ? `${selectedOrder._id}-${selectedOrder.updatedAt}`
                : "loading"
            }
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

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: typeof faDownload;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#dacec4] bg-white px-4 text-[10px] font-black uppercase tracking-wider text-[#173044]"
    >
      <FontAwesomeIcon icon={icon} />
      {label}
    </button>
  );
}
function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: typeof faReceipt;
}) {
  return (
    <div className="rounded-[22px] border border-[#e8ddd3] bg-[#fffdf9] p-5 shadow-[0_10px_32px_rgba(30,35,40,.055)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[.17em] text-[#8a7e75]">
            {label}
          </p>
          <p className="mt-3 text-3xl font-black text-[#173044]">{value}</p>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#fff0e8] text-[#C8102E]">
          <FontAwesomeIcon icon={icon} />
        </span>
      </div>
    </div>
  );
}
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
