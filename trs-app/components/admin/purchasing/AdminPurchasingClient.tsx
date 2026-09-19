"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRotateRight,
  faBoxesStacked,
  faCheck,
  faChevronRight,
  faCircleExclamation,
  faDownload,
  faPlus,
  faSearch,
  faTrashCan,
  faTruckRampBox,
  faUserPlus,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

import { PageHeader } from "@/components/admin/AdminPrimitives";
import { CustomActionModal } from "@/components/admin/CustomActionModal";


import { type InventoryItem, type PickupPerson, type PurchaseOrder, type Supplier, purchasingStatuses as statuses, type PurchasingStatus } from "@/components/admin/purchasing/admin-purchasing.types";
import { fetchPurchasingData, mutatePurchasing } from "@/components/admin/purchasing/admin-purchasing.api";
import { CreateOrderDrawer } from "@/components/admin/purchasing/CreateOrderDrawer";
import { CreateVendorDrawer } from "@/components/admin/purchasing/CreateVendorDrawer";
import { OrderDrawer } from "@/components/admin/purchasing/OrderDrawer";


export function AdminPurchasingClient({
  canManagePurchases,
  canReadSuppliers,
  canManageSuppliers,
  canReadInventory,
}: {
  canManagePurchases: boolean;
  canReadSuppliers: boolean;
  canManageSuppliers: boolean;
  canReadInventory: boolean;
}) {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [pickupPeople, setPickupPeople] = useState<PickupPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PurchasingStatus>("all");
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(
    null,
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [vendorOpen, setVendorOpen] = useState(false);
  const [actionDialog, setActionDialog] = useState<{
    kind:
      "approve" | "cancel" | "delete_order" | "delete_vendor" | "delete_pickup";
    order?: PurchaseOrder;
    supplier?: Supplier;
    pickupPerson?: PickupPerson;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const data = await fetchPurchasingData(canReadSuppliers, canReadInventory);
      setOrders(data.orders); setPickupPeople(data.pickupPeople);
      setSuppliers(data.suppliers); setInventory(data.inventory);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load purchasing data.");
    } finally { setLoading(false); }
  }, [canReadInventory, canReadSuppliers]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (status !== "all" && order.status !== status) return false;
      if (!term) return true;
      return [
        order.purchaseOrderNumber,
        order.supplierId?.name,
        order.supplierId?.code,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [orders, search, status]);

  const itemCount = useMemo(
    () =>
      orders.reduce(
        (sum, order) =>
          sum +
          order.items.reduce(
            (lineSum, item) => lineSum + item.orderedQuantity,
            0,
          ),
        0,
      ),
    [orders],
  );

  async function mutate(url: string, options?: RequestInit) {
    setError(""); setNotice("");
    const payload = await mutatePurchasing(url, options);
    setNotice(payload.message); await loadData();
  }

  function approve(order: PurchaseOrder) {
    setActionDialog({ kind: "approve", order });
  }

  function cancel(order: PurchaseOrder) {
    setActionDialog({ kind: "cancel", order });
  }

  async function handleActionConfirm(value: string) {
    if (!actionDialog) return;
    setActionLoading(true);
    try {
      if (actionDialog.kind === "approve" && actionDialog.order) {
        await mutate(
          `/api/v1/admin/purchases/orders/${actionDialog.order._id}/approve`,
          { method: "POST" },
        );
        setSelectedOrder(null);
      } else if (actionDialog.kind === "cancel" && actionDialog.order) {
        await mutate(
          `/api/v1/admin/purchases/orders/${actionDialog.order._id}/cancel`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason: value }),
          },
        );
        setSelectedOrder(null);
      } else if (actionDialog.kind === "delete_order" && actionDialog.order) {
        await mutate(
          `/api/v1/admin/purchases/orders/${actionDialog.order._id}`,
          { method: "DELETE" },
        );
        setSelectedOrder(null);
      } else if (
        actionDialog.kind === "delete_vendor" &&
        actionDialog.supplier
      ) {
        await mutate(`/api/v1/admin/suppliers/${actionDialog.supplier._id}`, {
          method: "DELETE",
        });
      } else if (
        actionDialog.kind === "delete_pickup" &&
        actionDialog.pickupPerson
      ) {
        await mutate(
          `/api/v1/admin/purchases/pickup-persons/${actionDialog.pickupPerson._id}`,
          { method: "DELETE" },
        );
      }
      setActionDialog(null);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to complete the requested action.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Procurement"
        title="Purchasing management"
        description="Create simple vendor order requests by selecting the required inventory items and quantities. Invoice pricing is recorded later from the seller bill."
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={() => void loadData()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#dfd4cb] bg-white px-4 text-xs font-black text-[#173044]"
            >
              <FontAwesomeIcon icon={faArrowRotateRight} /> Refresh
            </button>
            {canManageSuppliers && (
              <button
                type="button"
                onClick={() => setVendorOpen(true)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#173044] bg-white px-4 text-xs font-black text-[#173044]"
              >
                <FontAwesomeIcon icon={faUserPlus} /> Manage vendors
              </button>
            )}
            {canManagePurchases && (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                disabled={!canReadSuppliers || !canReadInventory}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#C8102E] px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faPlus} /> New order request
              </button>
            )}
          </div>
        }
      />

      {(error || notice) && (
        <div
          className={`mb-5 rounded-2xl border px-4 py-3 text-sm font-semibold ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
        >
          {error || notice}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total requests"
          value={String(orders.length)}
          icon={faBoxesStacked}
        />
        <SummaryCard
          label="Open requests"
          value={String(
            orders.filter((order) =>
              ["draft", "approved", "partially_received"].includes(
                order.status,
              ),
            ).length,
          )}
          icon={faCircleExclamation}
        />
        <SummaryCard
          label="Items requested"
          value={String(itemCount)}
          icon={faCheck}
        />
        <SummaryCard
          label="Active vendors"
          value={String(
            suppliers.filter((supplier) => supplier.isActive).length,
          )}
          icon={faTruckRampBox}
        />
      </div>

      <section className="mt-5 overflow-hidden rounded-[24px] border border-[#e8ddd3] bg-[#fffdf9] shadow-[0_10px_32px_rgba(30,35,40,.05)]">
        <div className="border-b border-[#eee4dc] p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative min-w-0 flex-1 lg:max-w-md">
              <FontAwesomeIcon
                icon={faSearch}
                className="pointer-events-none absolute left-4 top-1/2 h-4 -translate-y-1/2 text-[#9b8f86]"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search request or vendor"
                className="h-11 w-full rounded-xl border border-[#e4d9d0] bg-white pl-11 pr-4 text-sm font-semibold text-[#173044] outline-none focus:border-[#C8102E]"
              />
            </div>
            <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
              {statuses.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setStatus(item)}
                  className={`shrink-0 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-wider ${status === item ? "bg-[#173044] text-white" : "bg-[#f4ede7] text-[#6f645c]"}`}
                >
                  {item.replaceAll("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingState />
        ) : filteredOrders.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <FontAwesomeIcon
              icon={faBoxesStacked}
              className="h-8 text-[#c8bbb1]"
            />
            <p className="mt-4 text-sm font-black text-[#173044]">
              No order requests found
            </p>
            <p className="mt-1 text-xs text-[#8b7e75]">
              Create a request or adjust the current filters.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[820px] text-left">
                <thead className="bg-[#fbf6f1] text-[10px] font-black uppercase tracking-wider text-[#887b72]">
                  <tr>
                    <th className="px-5 py-4">Request</th>
                    <th className="px-5 py-4">Vendor</th>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Items</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eee4dc]">
                  {filteredOrders.map((order) => (
                    <tr key={order._id} className="hover:bg-[#fffaf6]">
                      <td className="px-5 py-4">
                        <b className="text-sm text-[#173044]">
                          {order.purchaseOrderNumber}
                        </b>
                      </td>
                      <td className="px-5 py-4">
                        <b className="text-xs text-[#173044]">
                          {order.supplierId?.name ?? "Unknown"}
                        </b>
                        <p className="mt-1 text-[10px] text-[#8b7e75]">
                          {order.supplierId?.code ?? "—"}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-xs font-semibold text-[#655b54]">
                        {formatDate(order.orderDate)}
                      </td>
                      <td className="px-5 py-4 text-xs font-black text-[#173044]">
                        {order.items.length}
                      </td>
                      <td className="px-5 py-4">
                        <PurchaseStatus value={order.status} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="grid h-9 w-9 place-items-center rounded-xl border border-[#e5dad1] text-[#173044]"
                        >
                          <FontAwesomeIcon icon={faChevronRight} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 p-4 xl:hidden">
              {filteredOrders.map((order) => (
                <button
                  key={order._id}
                  type="button"
                  onClick={() => setSelectedOrder(order)}
                  className="min-w-0 rounded-2xl border border-[#e8ddd3] bg-white p-4 text-left shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[#173044]">
                        {order.purchaseOrderNumber}
                      </p>
                      <p className="mt-1 truncate text-xs font-semibold text-[#746960]">
                        {order.supplierId?.name ?? "Unknown vendor"}
                      </p>
                    </div>
                    <PurchaseStatus value={order.status} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <Info label="Date" value={formatDate(order.orderDate)} />
                    <Info label="Items" value={String(order.items.length)} />
                    <Info
                      label="Fulfilment"
                      value={
                        order.fulfilmentType === "self_pickup"
                          ? "Self Pickup"
                          : "Vendor Delivery"
                      }
                    />
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      <AnimatePresence>
        {selectedOrder && (
          <OrderDrawer
            order={selectedOrder}
            canManage={canManagePurchases}
            onClose={() => setSelectedOrder(null)}
            onApprove={approve}
            onCancel={cancel}
            onDelete={(order) =>
              setActionDialog({ kind: "delete_order", order })
            }
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {createOpen && (
          <CreateOrderDrawer
            suppliers={suppliers.filter((supplier) => supplier.isActive)}
            inventory={inventory}
            pickupPeople={pickupPeople}
            onClose={() => setCreateOpen(false)}
            onCreated={async () => {
              setCreateOpen(false);
              setNotice("Order request created.");
              await loadData();
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {vendorOpen && (
          <CreateVendorDrawer
            suppliers={suppliers}
            pickupPeople={pickupPeople}
            onClose={() => setVendorOpen(false)}
            onChanged={loadData}
            onDeleteVendor={(supplier) =>
              setActionDialog({ kind: "delete_vendor", supplier })
            }
            onDeletePickup={(pickupPerson) =>
              setActionDialog({ kind: "delete_pickup", pickupPerson })
            }
          />
        )}
      </AnimatePresence>
      <CustomActionModal
        open={Boolean(actionDialog)}
        title={
          actionDialog?.kind === "approve"
            ? "Approve purchase request?"
            : actionDialog?.kind === "cancel"
              ? "Cancel purchase request?"
              : actionDialog?.kind === "delete_order"
                ? "Delete purchase record?"
                : actionDialog?.kind === "delete_vendor"
                  ? "Delete vendor?"
                  : "Delete pickup person?"
        }
        description={
          actionDialog?.kind === "approve"
            ? `Approve ${actionDialog.order?.purchaseOrderNumber ?? "this request"}?`
            : actionDialog?.kind === "cancel"
              ? `Provide a reason for cancelling ${actionDialog.order?.purchaseOrderNumber ?? "this request"}.`
              : actionDialog?.kind === "delete_order"
                ? `${actionDialog.order?.purchaseOrderNumber ?? "This record"} will be permanently deleted. This cannot be undone.`
                : actionDialog?.kind === "delete_vendor"
                  ? `${actionDialog.supplier?.name ?? "This vendor"} will be permanently deleted when no purchase records depend on it.`
                  : `${actionDialog?.pickupPerson?.name ?? "This pickup person"} will be permanently deleted when no purchase records depend on them.`
        }
        confirmLabel={
          actionDialog?.kind === "approve"
            ? "Approve request"
            : actionDialog?.kind === "cancel"
              ? "Cancel request"
              : "Delete permanently"
        }
        tone={actionDialog?.kind === "approve" ? "default" : "danger"}
        loading={actionLoading}
        inputLabel={
          actionDialog?.kind === "cancel" ? "Cancellation reason" : undefined
        }
        inputPlaceholder={
          actionDialog?.kind === "cancel"
            ? "Enter the reason for cancellation"
            : undefined
        }
        inputRequired={actionDialog?.kind === "cancel"}
        onClose={() => {
          if (!actionLoading) setActionDialog(null);
        }}
        onConfirm={handleActionConfirm}
      />
    </>
  );
}

function Drawer({
  title,
  eyebrow,
  onClose,
  children,
}: {
  title: string;
  eyebrow: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-end justify-end bg-black/45 backdrop-blur-[2px] sm:items-stretch"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.aside
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        className="flex h-[94dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-[#fffdf9] shadow-2xl sm:h-full sm:max-w-3xl sm:rounded-none"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#eee4dc] px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#C8102E]">
              {eyebrow}
            </p>
            <h2 className="mt-1 truncate text-xl font-black text-[#173044]">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#e4d9d0] bg-white text-[#173044]"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </header>
        {children}
      </motion.aside>
    </motion.div>
  );
}
function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: typeof faBoxesStacked;
}) {
  return (
    <article className="rounded-[22px] border border-[#e8ddd3] bg-[#fffdf9] p-5 shadow-[0_10px_32px_rgba(30,35,40,.055)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[.17em] text-[#8a7e75]">
            {label}
          </p>
          <p className="mt-3 truncate text-2xl font-black tracking-[-.04em] text-[#122b3c]">
            {value}
          </p>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#fff0e8] text-[#C8102E]">
          <FontAwesomeIcon icon={icon} />
        </span>
      </div>
    </article>
  );
}
function PurchaseStatus({ value }: { value: PurchaseOrder["status"] }) {
  const tones: Record<PurchaseOrder["status"], string> = {
    draft: "bg-slate-100 text-slate-700",
    approved: "bg-blue-50 text-blue-700",
    partially_received: "bg-amber-50 text-amber-700",
    received: "bg-emerald-50 text-emerald-700",
    cancelled: "bg-red-50 text-red-700",
  };
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${tones[value]}`}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-[#f8f2ed] p-3">
      <p className="text-[9px] font-black uppercase tracking-wider text-[#8b7e75]">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-black text-[#173044]">{value}</p>
    </div>
  );
}
function LoadingState() {
  return (
    <div className="grid gap-3 p-4">
      <div className="h-24 animate-pulse rounded-2xl bg-[#f1e9e2]" />
      <div className="h-24 animate-pulse rounded-2xl bg-[#f1e9e2]" />
      <div className="h-24 animate-pulse rounded-2xl bg-[#f1e9e2]" />
    </div>
  );
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
