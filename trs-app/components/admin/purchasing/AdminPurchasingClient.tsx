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

import { todayInputValue } from "@/lib/validation/dateTime";

type ApiResponse<T> = { success: boolean; message: string; data: T };

type Supplier = {
  _id: string;
  name: string;
  code: string;
  contactPerson?: string;
  phone?: string;
  alternatePhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  notes?: string;
  isActive: boolean;
};

type InventoryItem = {
  _id: string;
  name: string;
  sku: string;
  unit: string;
  currentStock: number;
  isActive: boolean;
};

type PurchaseOrderItem = {
  _id: string;
  itemName: string;
  sku: string;
  unit: string;
  orderedQuantity: number;
  receivedQuantity: number;
};

type PickupPerson = { _id: string; name: string; whatsappNumber: string; isActive: boolean };
type WhatsAppDelivery = { recipientType: "vendor" | "admin" | "pickup_person"; destination: string; status: "queued" | "sent" | "failed" | "skipped"; failureReason?: string };

type PurchaseOrder = {
  _id: string;
  purchaseOrderNumber: string;
  supplierId: Supplier;
  status: "draft" | "approved" | "partially_received" | "received" | "cancelled";
  orderDate: string;
  expectedDeliveryDate: string | null;
  items: PurchaseOrderItem[];
  notes: string;
  fulfilmentType: "vendor_delivery" | "self_pickup";
  pickupPersonName?: string;
  whatsappDeliveries?: WhatsAppDelivery[];
  cancellationReason?: string;
};

type DraftLine = { inventoryItemId: string; orderedQuantity: string };

type VendorDraft = {
  name: string;
  code: string;
  contactPerson: string;
  phone: string;
  alternatePhone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  notes: string;
};

const statuses = ["all", "draft", "approved", "partially_received", "received", "cancelled"] as const;
const inputClass = "h-11 w-full min-w-0 rounded-xl border border-[#e1d6cd] bg-white px-3 text-sm font-semibold text-[#173044] outline-none focus:border-[#C8102E]";

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
  const [status, setStatus] = useState<(typeof statuses)[number]>("all");
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [vendorOpen, setVendorOpen] = useState(false);
  const [actionDialog, setActionDialog] = useState<{ kind: "approve" | "cancel" | "delete_order" | "delete_vendor" | "delete_pickup"; order?: PurchaseOrder; supplier?: Supplier; pickupPerson?: PickupPerson } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const requests: Promise<Response>[] = [
        fetch("/api/v1/admin/purchases/orders", { cache: "no-store" }),
        fetch("/api/v1/admin/purchases/pickup-persons", { cache: "no-store" }),
      ];
      if (canReadSuppliers) requests.push(fetch("/api/v1/admin/suppliers", { cache: "no-store" }));
      if (canReadInventory) requests.push(fetch("/api/v1/admin/inventory/items", { cache: "no-store" }));

      const responses = await Promise.all(requests);
      const payloads = await Promise.all(responses.map((response) => response.json()));
      const failedIndex = responses.findIndex((response) => !response.ok);
      if (failedIndex >= 0) throw new Error(payloads[failedIndex]?.message ?? "Unable to load purchasing data.");

      setOrders((payloads[0] as ApiResponse<PurchaseOrder[]>).data);
      setPickupPeople((payloads[1] as ApiResponse<PickupPerson[]>).data);
      let cursor = 2;
      if (canReadSuppliers) {
        setSuppliers((payloads[cursor] as ApiResponse<Supplier[]>).data);
        cursor += 1;
      }
      if (canReadInventory) {
        setInventory((payloads[cursor] as ApiResponse<InventoryItem[]>).data.filter((item) => item.isActive));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load purchasing data.");
    } finally {
      setLoading(false);
    }
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
      return [order.purchaseOrderNumber, order.supplierId?.name, order.supplierId?.code]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [orders, search, status]);

  const itemCount = useMemo(
    () => orders.reduce((sum, order) => sum + order.items.reduce((lineSum, item) => lineSum + item.orderedQuantity, 0), 0),
    [orders],
  );

  async function mutate(url: string, options?: RequestInit) {
    setError("");
    setNotice("");
    const response = await fetch(url, options);
    const payload = (await response.json()) as ApiResponse<unknown>;
    if (!response.ok) throw new Error(payload.message || "Request failed.");
    setNotice(payload.message);
    await loadData();
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
        await mutate(`/api/v1/admin/purchases/orders/${actionDialog.order._id}/approve`, { method: "POST" });
        setSelectedOrder(null);
      } else if (actionDialog.kind === "cancel" && actionDialog.order) {
        await mutate(`/api/v1/admin/purchases/orders/${actionDialog.order._id}/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: value }),
        });
        setSelectedOrder(null);
      } else if (actionDialog.kind === "delete_order" && actionDialog.order) {
        await mutate(`/api/v1/admin/purchases/orders/${actionDialog.order._id}`, { method: "DELETE" });
        setSelectedOrder(null);
      } else if (actionDialog.kind === "delete_vendor" && actionDialog.supplier) {
        await mutate(`/api/v1/admin/suppliers/${actionDialog.supplier._id}`, { method: "DELETE" });
      } else if (actionDialog.kind === "delete_pickup" && actionDialog.pickupPerson) {
        await mutate(`/api/v1/admin/purchases/pickup-persons/${actionDialog.pickupPerson._id}`, { method: "DELETE" });
      }
      setActionDialog(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to complete the requested action.");
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
            <button type="button" onClick={() => void loadData()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#dfd4cb] bg-white px-4 text-xs font-black text-[#173044]">
              <FontAwesomeIcon icon={faArrowRotateRight} /> Refresh
            </button>
            {canManageSuppliers && (
              <button type="button" onClick={() => setVendorOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#173044] bg-white px-4 text-xs font-black text-[#173044]">
                <FontAwesomeIcon icon={faUserPlus} /> Manage vendors
              </button>
            )}
            {canManagePurchases && (
              <button type="button" onClick={() => setCreateOpen(true)} disabled={!canReadSuppliers || !canReadInventory} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#C8102E] px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
                <FontAwesomeIcon icon={faPlus} /> New order request
              </button>
            )}
          </div>
        }
      />

      {(error || notice) && <div className={`mb-5 rounded-2xl border px-4 py-3 text-sm font-semibold ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{error || notice}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Total requests" value={String(orders.length)} icon={faBoxesStacked} />
        <SummaryCard label="Open requests" value={String(orders.filter((order) => ["draft", "approved", "partially_received"].includes(order.status)).length)} icon={faCircleExclamation} />
        <SummaryCard label="Items requested" value={String(itemCount)} icon={faCheck} />
        <SummaryCard label="Active vendors" value={String(suppliers.filter((supplier) => supplier.isActive).length)} icon={faTruckRampBox} />
      </div>

      <section className="mt-5 overflow-hidden rounded-[24px] border border-[#e8ddd3] bg-[#fffdf9] shadow-[0_10px_32px_rgba(30,35,40,.05)]">
        <div className="border-b border-[#eee4dc] p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative min-w-0 flex-1 lg:max-w-md">
              <FontAwesomeIcon icon={faSearch} className="pointer-events-none absolute left-4 top-1/2 h-4 -translate-y-1/2 text-[#9b8f86]" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search request or vendor" className="h-11 w-full rounded-xl border border-[#e4d9d0] bg-white pl-11 pr-4 text-sm font-semibold text-[#173044] outline-none focus:border-[#C8102E]" />
            </div>
            <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
              {statuses.map((item) => <button key={item} type="button" onClick={() => setStatus(item)} className={`shrink-0 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-wider ${status === item ? "bg-[#173044] text-white" : "bg-[#f4ede7] text-[#6f645c]"}`}>{item.replaceAll("_", " ")}</button>)}
            </div>
          </div>
        </div>

        {loading ? <LoadingState /> : filteredOrders.length === 0 ? (
          <div className="px-5 py-16 text-center"><FontAwesomeIcon icon={faBoxesStacked} className="h-8 text-[#c8bbb1]" /><p className="mt-4 text-sm font-black text-[#173044]">No order requests found</p><p className="mt-1 text-xs text-[#8b7e75]">Create a request or adjust the current filters.</p></div>
        ) : (
          <>
            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[820px] text-left">
                <thead className="bg-[#fbf6f1] text-[10px] font-black uppercase tracking-wider text-[#887b72]"><tr><th className="px-5 py-4">Request</th><th className="px-5 py-4">Vendor</th><th className="px-5 py-4">Date</th><th className="px-5 py-4">Items</th><th className="px-5 py-4">Status</th><th className="px-5 py-4" /></tr></thead>
                <tbody className="divide-y divide-[#eee4dc]">{filteredOrders.map((order) => <tr key={order._id} className="hover:bg-[#fffaf6]"><td className="px-5 py-4"><b className="text-sm text-[#173044]">{order.purchaseOrderNumber}</b></td><td className="px-5 py-4"><b className="text-xs text-[#173044]">{order.supplierId?.name ?? "Unknown"}</b><p className="mt-1 text-[10px] text-[#8b7e75]">{order.supplierId?.code ?? "—"}</p></td><td className="px-5 py-4 text-xs font-semibold text-[#655b54]">{formatDate(order.orderDate)}</td><td className="px-5 py-4 text-xs font-black text-[#173044]">{order.items.length}</td><td className="px-5 py-4"><PurchaseStatus value={order.status} /></td><td className="px-5 py-4 text-right"><button type="button" onClick={() => setSelectedOrder(order)} className="grid h-9 w-9 place-items-center rounded-xl border border-[#e5dad1] text-[#173044]"><FontAwesomeIcon icon={faChevronRight} /></button></td></tr>)}</tbody>
              </table>
            </div>
            <div className="grid gap-3 p-4 xl:hidden">{filteredOrders.map((order) => <button key={order._id} type="button" onClick={() => setSelectedOrder(order)} className="min-w-0 rounded-2xl border border-[#e8ddd3] bg-white p-4 text-left shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-black text-[#173044]">{order.purchaseOrderNumber}</p><p className="mt-1 truncate text-xs font-semibold text-[#746960]">{order.supplierId?.name ?? "Unknown vendor"}</p></div><PurchaseStatus value={order.status} /></div><div className="mt-4 grid grid-cols-2 gap-3 text-xs"><Info label="Date" value={formatDate(order.orderDate)} /><Info label="Items" value={String(order.items.length)} /><Info label="Fulfilment" value={order.fulfilmentType === "self_pickup" ? "Self Pickup" : "Vendor Delivery"} /></div></button>)}</div>
          </>
        )}
      </section>

      <AnimatePresence>{selectedOrder && <OrderDrawer order={selectedOrder} canManage={canManagePurchases} onClose={() => setSelectedOrder(null)} onApprove={approve} onCancel={cancel} onDelete={(order) => setActionDialog({ kind: "delete_order", order })} />}</AnimatePresence>
      <AnimatePresence>{createOpen && <CreateOrderDrawer suppliers={suppliers.filter((supplier) => supplier.isActive)} inventory={inventory} pickupPeople={pickupPeople} onClose={() => setCreateOpen(false)} onCreated={async () => { setCreateOpen(false); setNotice("Order request created."); await loadData(); }} />}</AnimatePresence>
      <AnimatePresence>{vendorOpen && <CreateVendorDrawer suppliers={suppliers} pickupPeople={pickupPeople} onClose={() => setVendorOpen(false)} onChanged={loadData} onDeleteVendor={(supplier) => setActionDialog({ kind: "delete_vendor", supplier })} onDeletePickup={(pickupPerson) => setActionDialog({ kind: "delete_pickup", pickupPerson })} />}</AnimatePresence>
      <CustomActionModal open={Boolean(actionDialog)} title={actionDialog?.kind === "approve" ? "Approve purchase request?" : actionDialog?.kind === "cancel" ? "Cancel purchase request?" : actionDialog?.kind === "delete_order" ? "Delete purchase record?" : actionDialog?.kind === "delete_vendor" ? "Delete vendor?" : "Delete pickup person?"} description={actionDialog?.kind === "approve" ? `Approve ${actionDialog.order?.purchaseOrderNumber ?? "this request"}?` : actionDialog?.kind === "cancel" ? `Provide a reason for cancelling ${actionDialog.order?.purchaseOrderNumber ?? "this request"}.` : actionDialog?.kind === "delete_order" ? `${actionDialog.order?.purchaseOrderNumber ?? "This record"} will be permanently deleted. This cannot be undone.` : actionDialog?.kind === "delete_vendor" ? `${actionDialog.supplier?.name ?? "This vendor"} will be permanently deleted when no purchase records depend on it.` : `${actionDialog?.pickupPerson?.name ?? "This pickup person"} will be permanently deleted when no purchase records depend on them.`} confirmLabel={actionDialog?.kind === "approve" ? "Approve request" : actionDialog?.kind === "cancel" ? "Cancel request" : "Delete permanently"} tone={actionDialog?.kind === "approve" ? "default" : "danger"} loading={actionLoading} inputLabel={actionDialog?.kind === "cancel" ? "Cancellation reason" : undefined} inputPlaceholder={actionDialog?.kind === "cancel" ? "Enter the reason for cancellation" : undefined} inputRequired={actionDialog?.kind === "cancel"} onClose={() => { if (!actionLoading) setActionDialog(null); }} onConfirm={handleActionConfirm} />
    </>
  );
}

function CreateOrderDrawer({ suppliers, inventory, pickupPeople, onClose, onCreated }: { suppliers: Supplier[]; inventory: InventoryItem[]; pickupPeople: PickupPerson[]; onClose: () => void; onCreated: () => Promise<void> }) {
  const [supplierId, setSupplierId] = useState(suppliers[0]?._id ?? "");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [fulfilmentType, setFulfilmentType] = useState<"vendor_delivery" | "self_pickup">("vendor_delivery");
  const [pickupPersonId, setPickupPersonId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([{ inventoryItemId: inventory[0]?._id ?? "", orderedQuantity: "1" }]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function updateLine(index: number, patch: Partial<DraftLine>) { setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line)); }
  function focusFirst(next: Record<string, string>, form: HTMLFormElement) { const key = Object.keys(next)[0]; if (key) form.querySelector<HTMLElement>(`[name="${key}"]`)?.focus(); }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const next: Record<string, string> = {};
    if (!supplierId) next.supplierId = "Select a vendor.";
    if (fulfilmentType === "self_pickup" && !pickupPersonId) next.pickupPersonId = "Select a pickup person.";
    lines.forEach((line, index) => { if (!line.inventoryItemId) next[`item-${index}`] = "Select an item."; if (!Number.isFinite(Number(line.orderedQuantity)) || Number(line.orderedQuantity) <= 0) next[`quantity-${index}`] = "Enter a quantity greater than zero."; });
    if (notes.trim().length > 1500) next.notes = "Notes cannot exceed 1500 characters.";
    setErrors(next); if (Object.keys(next).length) return focusFirst(next, event.currentTarget);
    const items = lines.map((line) => ({ inventoryItemId: line.inventoryItemId, orderedQuantity: Number(line.orderedQuantity) }));
    setSaving(true);
    try {
      const response = await fetch("/api/v1/admin/purchases/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ supplierId, expectedDeliveryDate: expectedDeliveryDate || null, fulfilmentType, pickupPersonId: fulfilmentType === "self_pickup" ? pickupPersonId : null, items, notes: notes.trim() }) });
      const payload = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok) throw new Error(payload.message || "Unable to create order request.");
      await onCreated();
    } catch (caught) { setErrors({ form: caught instanceof Error ? caught.message : "Unable to create order request." }); }
    finally { setSaving(false); }
  }

  return <Drawer title="New order request" eyebrow="Purchasing" onClose={onClose}><form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col"><div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">{errors.form && <ValidationError message={errors.form} />}<div className="grid gap-4 sm:grid-cols-2"><Field label="Vendor *" error={errors.supplierId}><select name="supplierId" value={supplierId} onChange={(event) => setSupplierId(event.target.value)} className={inputClass} aria-invalid={Boolean(errors.supplierId)}>{suppliers.length === 0 && <option value="">No active vendors</option>}{suppliers.map((supplier) => <option key={supplier._id} value={supplier._id}>{supplier.name} ({supplier.code})</option>)}</select></Field><Field label="Expected date" error={errors.expectedDeliveryDate}><input name="expectedDeliveryDate" type="date" min={todayInputValue()} value={expectedDeliveryDate} onChange={(event) => setExpectedDeliveryDate(event.target.value)} className={inputClass} /></Field><Field label="Fulfilment type *"><select name="fulfilmentType" value={fulfilmentType} onChange={(event) => { const value = event.target.value as "vendor_delivery" | "self_pickup"; setFulfilmentType(value); if (value === "vendor_delivery") setPickupPersonId(""); }} className={inputClass}><option value="vendor_delivery">Vendor Delivery</option><option value="self_pickup">Self Pickup</option></select></Field>{fulfilmentType === "self_pickup" && <Field label="Pickup person *" error={errors.pickupPersonId}><select name="pickupPersonId" value={pickupPersonId} onChange={(event) => setPickupPersonId(event.target.value)} className={inputClass}><option value="">Select pickup person</option>{pickupPeople.filter((person) => person.isActive).map((person) => <option key={person._id} value={person._id}>{person.name} · {person.whatsappNumber}</option>)}</select></Field>}</div><section><div className="flex items-center justify-between gap-3"><div><h3 className="text-xs font-black uppercase tracking-wider text-[#173044]">Items to order</h3><p className="mt-1 text-xs text-[#82766d]">Select the item and required quantity only.</p></div><button type="button" onClick={() => setLines((current) => [...current, { inventoryItemId: inventory[0]?._id ?? "", orderedQuantity: "1" }])} className="shrink-0 rounded-xl border border-[#173044] px-3 py-2 text-[10px] font-black text-[#173044]"><FontAwesomeIcon icon={faPlus} className="mr-1" /> Add item</button></div><div className="mt-3 space-y-3">{lines.map((line, index) => { const selected = inventory.find((item) => item._id === line.inventoryItemId); return <div key={`${index}-${line.inventoryItemId}`} className="rounded-2xl border border-[#e8ddd3] bg-white p-4"><div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px_auto]"><Field label="Inventory item" error={errors[`item-${index}`]}><select name={`item-${index}`} value={line.inventoryItemId} onChange={(event) => updateLine(index, { inventoryItemId: event.target.value })} className={inputClass}>{inventory.map((item) => <option key={item._id} value={item._id}>{item.name} · {item.sku}</option>)}</select></Field><Field label={`Quantity${selected ? ` (${selected.unit})` : ""}`} error={errors[`quantity-${index}`]}><input name={`quantity-${index}`} type="number" min="0.0001" step="0.0001" value={line.orderedQuantity} onChange={(event) => updateLine(index, { orderedQuantity: event.target.value })} className={inputClass} /></Field><button type="button" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))} disabled={lines.length === 1} className="self-end rounded-xl border border-red-200 px-3 py-3 text-[10px] font-black text-red-700 disabled:opacity-40">Remove</button></div>{selected && <p className="mt-2 text-[10px] font-semibold text-[#867970]">Current stock: {selected.currentStock} {selected.unit}</p>}</div>; })}</div></section><Field label="Notes" error={errors.notes}><textarea name="notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} maxLength={1500} className={`${inputClass} h-auto py-3`} /></Field></div><div className="flex flex-col-reverse gap-2 border-t border-[#eee4dc] bg-white p-4 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} disabled={saving} className="min-h-11 rounded-xl border border-[#ded3ca] px-5 text-xs font-black text-[#173044]">Cancel</button><button type="submit" disabled={saving} className="min-h-11 rounded-xl bg-[#C8102E] px-5 text-xs font-black text-white disabled:opacity-60">{saving ? "Creating…" : "Create request"}</button></div></form></Drawer>;
}

function CreateVendorDrawer({ suppliers, pickupPeople, onClose, onChanged, onDeleteVendor, onDeletePickup }: { suppliers: Supplier[]; pickupPeople: PickupPerson[]; onClose: () => void; onChanged: () => Promise<void>; onDeleteVendor: (supplier: Supplier) => void; onDeletePickup: (person: PickupPerson) => void }) {
  const [mode, setMode] = useState<"vendor" | "pickup">("vendor");
  const [form, setForm] = useState<VendorDraft>({ name: "", code: "", contactPerson: "", phone: "", alternatePhone: "", addressLine1: "", addressLine2: "", city: "", state: "", postalCode: "", notes: "" });
  const [pickup, setPickup] = useState({ name: "", whatsappNumber: "" });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const phonePattern = /^(?:\+91)?[6-9]\d{9}$/;
  function update(key: keyof VendorDraft, value: string) { setForm((current) => ({ ...current, [key]: value })); }
  function cleanPhone(value: string) { return value.replace(/\D/g, "").slice(0, 10); }

  async function request(url: string, options: RequestInit) {
    setSaving(true); setErrors({});
    try {
      const response = await fetch(url, options);
      const payload = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok) throw new Error(payload.message || "Unable to save changes.");
      await onChanged();
      return true;
    } catch (caught) { setErrors({ form: caught instanceof Error ? caught.message : "Unable to save changes." }); return false; }
    finally { setSaving(false); }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (saving) return;
    const next: Record<string, string> = {};
    if (mode === "vendor") {
      if (form.name.trim().length < 2) next.name = "Enter at least 2 characters.";
      if (!/^[A-Za-z0-9_-]{2,40}$/.test(form.code)) next.code = "Use 2–40 letters, numbers, _ or -.";
      if (!phonePattern.test(form.phone.trim())) next.phone = "Enter a valid 10-digit Indian WhatsApp number.";
      if (form.alternatePhone && !phonePattern.test(form.alternatePhone.trim())) next.alternatePhone = "Enter a valid 10-digit Indian phone number.";
    } else {
      if (pickup.name.trim().length < 2) next.name = "Enter at least 2 characters.";
      if (!phonePattern.test(pickup.whatsappNumber.trim())) next.whatsappNumber = "Enter a valid 10-digit Indian WhatsApp number.";
    }
    setErrors(next);
    if (Object.keys(next).length) { event.currentTarget.querySelector<HTMLElement>(`[name="${Object.keys(next)[0]}"]`)?.focus(); return; }
    const saved = await request(mode === "vendor" ? "/api/v1/admin/suppliers" : "/api/v1/admin/purchases/pickup-persons", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mode === "vendor" ? { ...form, name: form.name.trim(), code: form.code.trim(), phone: form.phone.trim(), alternatePhone: form.alternatePhone.trim() } : { name: pickup.name.trim(), whatsappNumber: pickup.whatsappNumber.trim() }),
    });
    if (!saved) return;
    if (mode === "vendor") setForm({ name: "", code: "", contactPerson: "", phone: "", alternatePhone: "", addressLine1: "", addressLine2: "", city: "", state: "", postalCode: "", notes: "" });
    else setPickup({ name: "", whatsappNumber: "" });
  }

  async function toggleVendor(supplier: Supplier) { await request(`/api/v1/admin/suppliers/${supplier._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !supplier.isActive }) }); }
  async function togglePickup(person: PickupPerson) { await request(`/api/v1/admin/purchases/pickup-persons/${person._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !person.isActive }) }); }

  return <Drawer title={mode === "vendor" ? "Manage vendors" : "Manage pickup people"} eyebrow="Purchasing contacts" onClose={onClose}><form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col"><div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6"><div className="flex gap-2"><button type="button" onClick={() => { setMode("vendor"); setErrors({}); }} className={`rounded-xl px-4 py-2 text-xs font-black ${mode === "vendor" ? "bg-[#173044] text-white" : "bg-[#f4ede7] text-[#173044]"}`}>Vendors ({suppliers.length})</button><button type="button" onClick={() => { setMode("pickup"); setErrors({}); }} className={`rounded-xl px-4 py-2 text-xs font-black ${mode === "pickup" ? "bg-[#173044] text-white" : "bg-[#f4ede7] text-[#173044]"}`}>Pickup people ({pickupPeople.length})</button></div>{errors.form && <ValidationError message={errors.form} />}
  {mode === "vendor" ? <><div className="grid gap-4 sm:grid-cols-2"><Field label="Vendor name *" error={errors.name}><input name="name" value={form.name} onChange={(e) => update("name", e.target.value)} className={inputClass} /></Field><Field label="Vendor code *" error={errors.code}><input name="code" maxLength={40} value={form.code} onChange={(e) => update("code", e.target.value.replace(/[^A-Za-z0-9_-]/g, "").toUpperCase())} className={inputClass} /></Field><Field label="Contact person"><input name="contactPerson" maxLength={160} value={form.contactPerson} onChange={(e) => update("contactPerson", e.target.value)} className={inputClass} /></Field><Field label="WhatsApp number *" error={errors.phone}><input name="phone" inputMode="numeric" maxLength={10} value={form.phone} onChange={(e) => update("phone", cleanPhone(e.target.value))} className={inputClass} placeholder="9876543210" /></Field><Field label="Alternate phone" error={errors.alternatePhone}><input name="alternatePhone" inputMode="numeric" maxLength={10} value={form.alternatePhone} onChange={(e) => update("alternatePhone", cleanPhone(e.target.value))} className={inputClass} placeholder="9876543210" /></Field><Field label="Address line 1"><input value={form.addressLine1} maxLength={240} onChange={(e) => update("addressLine1", e.target.value)} className={inputClass} /></Field><Field label="Address line 2"><input value={form.addressLine2} maxLength={240} onChange={(e) => update("addressLine2", e.target.value)} className={inputClass} /></Field><Field label="City"><input value={form.city} maxLength={100} onChange={(e) => update("city", e.target.value)} className={inputClass} /></Field><Field label="State"><input value={form.state} maxLength={100} onChange={(e) => update("state", e.target.value)} className={inputClass} /></Field><Field label="Postal code"><input value={form.postalCode} maxLength={20} onChange={(e) => update("postalCode", e.target.value)} className={inputClass} /></Field></div><Field label="Notes"><textarea rows={4} maxLength={1500} value={form.notes} onChange={(e) => update("notes", e.target.value)} className={`${inputClass} h-auto py-3`} /></Field><ContactList empty="No vendors added yet." items={suppliers.map((supplier) => ({ id: supplier._id, title: supplier.name, subtitle: `${supplier.code} · ${supplier.phone || "No WhatsApp"} · ${supplier.isActive ? "Active" : "Inactive"}`, active: supplier.isActive, onToggle: () => void toggleVendor(supplier), onDelete: () => onDeleteVendor(supplier) }))} saving={saving} /></> : <><div className="grid gap-4 sm:grid-cols-2"><Field label="Pickup person name *" error={errors.name}><input name="name" maxLength={120} value={pickup.name} onChange={(e) => setPickup((v) => ({ ...v, name: e.target.value }))} className={inputClass} /></Field><Field label="WhatsApp number *" error={errors.whatsappNumber}><input name="whatsappNumber" inputMode="numeric" maxLength={10} value={pickup.whatsappNumber} onChange={(e) => setPickup((v) => ({ ...v, whatsappNumber: cleanPhone(e.target.value) }))} className={inputClass} placeholder="9876543210" /></Field></div><ContactList empty="No pickup people added yet." items={pickupPeople.map((person) => ({ id: person._id, title: person.name, subtitle: `${person.whatsappNumber} · ${person.isActive ? "Active" : "Inactive"}`, active: person.isActive, onToggle: () => void togglePickup(person), onDelete: () => onDeletePickup(person) }))} saving={saving} /></>}</div><div className="flex flex-col-reverse gap-2 border-t border-[#eee4dc] bg-white p-4 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} disabled={saving} className="min-h-11 rounded-xl border border-[#ded3ca] px-5 text-xs font-black text-[#173044]">Close</button><button type="submit" disabled={saving} className="min-h-11 rounded-xl bg-[#C8102E] px-5 text-xs font-black text-white disabled:opacity-60">{saving ? "Saving…" : mode === "vendor" ? "Add vendor" : "Add pickup person"}</button></div></form></Drawer>;
}

function ContactList({ empty, items, saving }: { empty: string; items: { id: string; title: string; subtitle: string; active: boolean; onToggle: () => void; onDelete: () => void }[]; saving: boolean }) {
  return <section><p className="mb-2 text-[10px] font-black uppercase tracking-wider text-[#756960]">Existing records</p><div className="space-y-2">{items.length === 0 ? <p className="text-xs text-[#81756c]">{empty}</p> : items.map((item) => <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-[#e8ddd3] bg-white p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-xs font-black text-[#173044]">{item.title}</p><p className="mt-1 text-[10px] text-[#81756c]">{item.subtitle}</p></div><div className="flex gap-2"><button type="button" disabled={saving} onClick={item.onToggle} className="rounded-lg border border-[#ded3ca] px-3 py-2 text-[10px] font-black text-[#173044]">{item.active ? "Deactivate" : "Activate"}</button><button type="button" disabled={saving} onClick={item.onDelete} className="rounded-lg border border-red-200 px-3 py-2 text-[10px] font-black text-red-700"><FontAwesomeIcon icon={faTrashCan} className="mr-1" />Delete</button></div></div>)}</div></section>;
}

function OrderDrawer({ order, canManage, onClose, onApprove, onCancel, onDelete }: { order: PurchaseOrder; canManage: boolean; onClose: () => void; onApprove: (order: PurchaseOrder) => void | Promise<void>; onCancel: (order: PurchaseOrder) => void | Promise<void>; onDelete: (order: PurchaseOrder) => void | Promise<void> }) {
  return <Drawer title={order.purchaseOrderNumber} eyebrow="Order request details" onClose={onClose}><div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e8ddd3] bg-[#fffaf6] p-4"><div><p className="text-xs font-black text-[#173044]">{order.supplierId?.name}</p><p className="mt-1 text-[10px] text-[#82766d]">{order.supplierId?.code} · {order.supplierId?.phone || "No WhatsApp number"}</p></div><PurchaseStatus value={order.status} /></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><Info label="Order date" value={formatDate(order.orderDate)} /><Info label="Expected" value={order.expectedDeliveryDate ? formatDate(order.expectedDeliveryDate) : "—"} /><Info label="Items" value={String(order.items.length)} /></div><section><h3 className="text-xs font-black uppercase tracking-wider text-[#173044]">Items requested</h3><div className="mt-3 space-y-3">{order.items.map((item) => <div key={item._id} className="rounded-2xl border border-[#e8ddd3] bg-white p-4"><p className="text-sm font-black text-[#173044]">{item.itemName}</p><p className="mt-1 text-[10px] text-[#81756c]">{item.sku}</p><div className="mt-3 grid grid-cols-2 gap-2"><Info label="Ordered" value={`${item.orderedQuantity} ${item.unit}`} /><Info label="Received" value={`${item.receivedQuantity} ${item.unit}`} /></div></div>)}</div></section>{order.pickupPersonName && <section><h3 className="text-xs font-black uppercase tracking-wider text-[#173044]">Pickup person</h3><p className="mt-2 rounded-2xl border border-[#e8ddd3] bg-white p-4 text-sm text-[#655b54]">{order.pickupPersonName}</p></section>}{order.whatsappDeliveries?.length ? <section><h3 className="text-xs font-black uppercase tracking-wider text-[#173044]">WhatsApp delivery</h3><div className="mt-2 space-y-2">{order.whatsappDeliveries.map((delivery, index) => <div key={`${delivery.recipientType}-${index}`} className="rounded-xl border border-[#e8ddd3] bg-white p-3 text-xs"><b className="capitalize text-[#173044]">{delivery.recipientType.replaceAll("_", " ")}: {delivery.status}</b><p className="mt-1 text-[#81756c]">{delivery.destination || "No number configured"}</p>{delivery.failureReason && <p className="mt-1 text-red-700">{delivery.failureReason}</p>}</div>)}</div></section> : null}{order.notes && <section><h3 className="text-xs font-black uppercase tracking-wider text-[#173044]">Notes</h3><p className="mt-2 rounded-2xl border border-[#e8ddd3] bg-white p-4 text-sm leading-6 text-[#655b54]">{order.notes}</p></section>}{order.cancellationReason && <section><h3 className="text-xs font-black uppercase tracking-wider text-red-700">Cancellation reason</h3><p className="mt-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{order.cancellationReason}</p></section>}</div><div className="flex flex-col-reverse gap-2 border-t border-[#eee4dc] bg-white p-4 sm:flex-row sm:flex-wrap sm:justify-end"><a href={`/api/v1/admin/purchases/orders/${order._id}/pdf`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#173044] px-5 text-xs font-black text-[#173044]"><FontAwesomeIcon icon={faDownload} className="mr-2" />Download PDF</a>{canManage && <button type="button" onClick={() => void onDelete(order)} className="min-h-11 rounded-xl border border-red-200 px-5 text-xs font-black text-red-700"><FontAwesomeIcon icon={faTrashCan} className="mr-2" />Delete record</button>}{canManage && ["draft", "approved"].includes(order.status) && <><button type="button" onClick={() => void onCancel(order)} className="min-h-11 rounded-xl border border-red-200 px-5 text-xs font-black text-red-700">Cancel request</button>{order.status === "draft" && <button type="button" onClick={() => void onApprove(order)} className="min-h-11 rounded-xl bg-[#173044] px-5 text-xs font-black text-white"><FontAwesomeIcon icon={faCheck} className="mr-2" />Approve request</button>}</>}</div></Drawer>;
}

function Drawer({ title, eyebrow, onClose, children }: { title: string; eyebrow: string; onClose: () => void; children: React.ReactNode }) { return <motion.div className="fixed inset-0 z-[100] flex items-end justify-end bg-black/45 backdrop-blur-[2px] sm:items-stretch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><motion.aside initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 260 }} className="flex h-[94dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-[#fffdf9] shadow-2xl sm:h-full sm:max-w-3xl sm:rounded-none"><header className="flex items-start justify-between gap-4 border-b border-[#eee4dc] px-4 py-4 sm:px-6"><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#C8102E]">{eyebrow}</p><h2 className="mt-1 truncate text-xl font-black text-[#173044]">{title}</h2></div><button type="button" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#e4d9d0] bg-white text-[#173044]"><FontAwesomeIcon icon={faXmark} /></button></header>{children}</motion.aside></motion.div>; }
function SummaryCard({ label, value, icon }: { label: string; value: string; icon: typeof faBoxesStacked }) { return <article className="rounded-[22px] border border-[#e8ddd3] bg-[#fffdf9] p-5 shadow-[0_10px_32px_rgba(30,35,40,.055)]"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.17em] text-[#8a7e75]">{label}</p><p className="mt-3 truncate text-2xl font-black tracking-[-.04em] text-[#122b3c]">{value}</p></div><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#fff0e8] text-[#C8102E]"><FontAwesomeIcon icon={icon} /></span></div></article>; }
function PurchaseStatus({ value }: { value: PurchaseOrder["status"] }) { const tones: Record<PurchaseOrder["status"], string> = { draft: "bg-slate-100 text-slate-700", approved: "bg-blue-50 text-blue-700", partially_received: "bg-amber-50 text-amber-700", received: "bg-emerald-50 text-emerald-700", cancelled: "bg-red-50 text-red-700" }; return <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${tones[value]}`}>{value.replaceAll("_", " ")}</span>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="min-w-0 rounded-xl bg-[#f8f2ed] p-3"><p className="text-[9px] font-black uppercase tracking-wider text-[#8b7e75]">{label}</p><p className="mt-1 truncate text-xs font-black text-[#173044]">{value}</p></div>; }
function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) { return <label className="block min-w-0"><span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-[#756960]">{label}</span>{children}{error && <span className="mt-1 block text-xs font-semibold text-red-700">{error}</span>}</label>; }
function ValidationError({ message }: { message: string }) { return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{message}</div>; }
function LoadingState() { return <div className="grid gap-3 p-4"><div className="h-24 animate-pulse rounded-2xl bg-[#f1e9e2]" /><div className="h-24 animate-pulse rounded-2xl bg-[#f1e9e2]" /><div className="h-24 animate-pulse rounded-2xl bg-[#f1e9e2]" /></div>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)); }
