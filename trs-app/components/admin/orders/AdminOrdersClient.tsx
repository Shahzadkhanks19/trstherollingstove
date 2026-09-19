"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { faCircleExclamation, faReceipt } from "@fortawesome/free-solid-svg-icons";

import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import type {
  AdminOrder,
  AdminOrderStatus,
  AdminPaymentMethod,
  AdminPaymentStatus,
} from "@/types/adminOrders";

import { dateTime, fetchAdminOrder, fetchAdminOrders, patchAdminOrderPayment, patchAdminOrderStatus, statusLabels, type SortField, type SortOrder } from "@/components/admin/orders/admin-orders.api";
import { OrderDrawer } from "@/components/admin/orders/OrderDrawer";
import { OrdersSkeleton, StatePanel } from "@/components/admin/orders/AdminOrdersUi";
import { AdminOrdersControls } from "@/components/admin/orders/AdminOrdersControls";
import { AdminOrdersList } from "@/components/admin/orders/AdminOrdersList";
import { AdminOrdersHeader } from "@/components/admin/orders/AdminOrdersHeader";
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
      <AdminOrdersHeader statusCounts={statusCounts} total={pagination.total} onExport={exportRows} />

      <section className="mt-5 overflow-hidden rounded-[24px] border border-[#e8ddd3] bg-[#fffdf9] shadow-[0_10px_32px_rgba(30,35,40,.05)] print:shadow-none">
        <AdminOrdersControls
          searchInput={searchInput}
          onSearchInput={setSearchInput}
          status={status}
          statusCounts={statusCounts}
          onStatus={(value) => { setStatus(value); setPagination((current) => ({ ...current, page: 1 })); }}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters((current) => !current)}
          onRefresh={() => void loadOrders()}
          orderMode={orderMode}
          onOrderMode={setOrderMode}
          paymentStatus={paymentStatus}
          onPaymentStatus={setPaymentStatus}
          paymentMethod={paymentMethod}
          onPaymentMethod={setPaymentMethod}
          from={from}
          onFrom={setFrom}
          to={to}
          onTo={setTo}
          onReset={resetFilters}
        />
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

