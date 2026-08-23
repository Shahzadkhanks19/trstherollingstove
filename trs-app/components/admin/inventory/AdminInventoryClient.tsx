"use client";

import { cloneElement, useCallback, useEffect, useMemo, useState, type ReactElement, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

const units = ["kg", "g", "l", "ml", "piece", "packet", "box", "bottle"] as const;
const movementTypes = [
  "opening",
  "purchase",
  "adjustment_in",
  "adjustment_out",
  "wastage",
  "return_in",
  "return_out",
] as const;

import { todayInputValue } from "@/lib/validation/dateTime";

type Unit = (typeof units)[number];
type MovementType = (typeof movementTypes)[number];
type InventoryItem = {
  _id: string;
  name: string;
  sku: string;
  category: string;
  unit: Unit;
  currentStock: number;
  reorderLevel: number;
  idealStockLevel: number;
  averageUnitCost: number;
  expiryTrackingEnabled: boolean;
  isActive: boolean;
  notes: string;
  updatedAt: string;
  archivedAt?: string | null;
};
type InventoryMovement = {
  _id: string;
  inventoryItemId: { _id: string; name: string; sku: string; unit: Unit } | string;
  type: string;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  unitCost: number;
  totalCost: number;
  reason: string;
  batchNumber: string;
  expiryDate: string | null;
  performedBy?: { name?: string; email?: string };
  createdAt: string;
};
type Summary = {
  totalItems: number;
  totalStockValue: number;
  lowStockItems: number;
  outOfStockItems: number;
};
type ApiEnvelope<T> = { data: T; message?: string };
type ItemForm = {
  name: string;
  sku: string;
  category: string;
  unit: Unit;
  currentStock: string;
  reorderLevel: string;
  idealStockLevel: string;
  averageUnitCost: string;
  expiryTrackingEnabled: boolean;
  isActive: boolean;
  notes: string;
};
type MovementForm = {
  inventoryItemId: string;
  type: MovementType;
  quantity: string;
  unitCost: string;
  reason: string;
  batchNumber: string;
  expiryDate: string;
};
type InventoryActionDialog = {
  type: "archive" | "permanent-delete";
  item: InventoryItem;
  confirmationText: string;
};

const emptyItem: ItemForm = {
  name: "",
  sku: "",
  category: "",
  unit: "kg",
  currentStock: "0",
  reorderLevel: "0",
  idealStockLevel: "0",
  averageUnitCost: "0",
  expiryTrackingEnabled: false,
  isActive: true,
  notes: "",
};
const emptyMovement: MovementForm = {
  inventoryItemId: "",
  type: "purchase",
  quantity: "",
  unitCost: "0",
  reason: "",
  batchNumber: "",
  expiryDate: "",
};
const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function unwrap<T>(payload: ApiEnvelope<T> | T): T {
  return typeof payload === "object" && payload !== null && "data" in payload
    ? (payload as ApiEnvelope<T>).data
    : (payload as T);
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const payload = (await response.json()) as ApiEnvelope<T> & { error?: string };
  if (!response.ok) throw new Error(payload.message ?? payload.error ?? "Request failed.");
  return unwrap(payload);
}

export function AdminInventoryClient({ canManage }: { canManage: boolean }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalItems: 0, totalStockValue: 0, lowStockItems: 0, outOfStockItems: 0 });
  const [tab, setTab] = useState<"items" | "movements">("items");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");
  const [itemStatus, setItemStatus] = useState<"active" | "archived" | "all">("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [itemEditor, setItemEditor] = useState<{ item: InventoryItem | null; form: ItemForm } | null>(null);
  const [movementEditor, setMovementEditor] = useState<MovementForm | null>(null);
  const [actionDialog, setActionDialog] = useState<InventoryActionDialog | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [itemData, movementData, summaryData] = await Promise.all([
        request<InventoryItem[]>("/api/v1/admin/inventory/items?includeArchived=true"),
        request<InventoryMovement[]>("/api/v1/admin/inventory/movements"),
        request<Summary>("/api/v1/admin/inventory/summary"),
      ]);
      setItems(itemData);
      setMovements(movementData);
      setSummary(summaryData);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load inventory.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const categories = useMemo(
    () => Array.from(new Set(items.map((item) => item.category))).sort((a, b) => a.localeCompare(b)),
    [items],
  );
  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      if (term && !`${item.name} ${item.sku} ${item.category}`.toLowerCase().includes(term)) return false;
      if (category && item.category !== category) return false;
      if (itemStatus === "active" && !item.isActive) return false;
      if (itemStatus === "archived" && item.isActive) return false;
      if (stockFilter === "low" && item.currentStock > item.reorderLevel) return false;
      if (stockFilter === "out" && item.currentStock > 0) return false;
      return true;
    });
  }, [items, search, category, stockFilter, itemStatus]);

  const openEdit = (item: InventoryItem) => setItemEditor({
    item,
    form: {
      name: item.name,
      sku: item.sku,
      category: item.category,
      unit: item.unit,
      currentStock: String(item.currentStock),
      reorderLevel: String(item.reorderLevel),
      idealStockLevel: String(item.idealStockLevel),
      averageUnitCost: String(item.averageUnitCost),
      expiryTrackingEnabled: item.expiryTrackingEnabled,
      isActive: item.isActive,
      notes: item.notes ?? "",
    },
  });

  const saveItem = async () => {
    if (!itemEditor) return;
    const { item, form } = itemEditor;
    if (!form.name.trim() || !form.sku.trim() || !form.category.trim()) {
      setError("Name, SKU and category are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body = {
        ...form,
        currentStock: Number(form.currentStock),
        reorderLevel: Number(form.reorderLevel),
        idealStockLevel: Number(form.idealStockLevel),
        averageUnitCost: Number(form.averageUnitCost),
      };
      await request(item ? `/api/v1/admin/inventory/items/${item._id}` : "/api/v1/admin/inventory/items", {
        method: item ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      setItemEditor(null);
      setNotice(item ? "Inventory item updated." : "Inventory item created.");
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save item.");
    } finally {
      setSaving(false);
    }
  };

  const requestArchiveItem = (item: InventoryItem) => {
    setActionDialog({
      type: "archive",
      item,
      confirmationText: "",
    });
  };

  const archiveItem = async (item: InventoryItem) => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await request(`/api/v1/admin/inventory/items/${item._id}`, {
        method: "DELETE",
      });
      setActionDialog(null);
      setNotice(`${item.name} was archived.`);
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to archive inventory item.");
    } finally {
      setSaving(false);
    }
  };

  const restoreItem = async (item: InventoryItem) => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await request(`/api/v1/admin/inventory/items/${item._id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: true }),
      });
      setNotice(`${item.name} was restored.`);
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to restore inventory item.");
    } finally {
      setSaving(false);
    }
  };

  const requestPermanentDeleteItem = (item: InventoryItem) => {
    setActionDialog({
      type: "permanent-delete",
      item,
      confirmationText: "",
    });
  };

  const permanentlyDeleteItem = async (item: InventoryItem) => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await request(
        `/api/v1/admin/inventory/items/${item._id}?permanent=true`,
        { method: "DELETE" },
      );
      setActionDialog(null);
      setNotice(`${item.name} was permanently deleted.`);
      await loadData();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to permanently delete inventory item.",
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmInventoryAction = async () => {
    if (!actionDialog) return;

    if (
      actionDialog.type === "permanent-delete" &&
      actionDialog.confirmationText !== "DELETE"
    ) {
      return;
    }

    if (actionDialog.type === "archive") {
      await archiveItem(actionDialog.item);
      return;
    }

    await permanentlyDeleteItem(actionDialog.item);
  };

  const saveMovement = async () => {
    if (!movementEditor?.inventoryItemId || !movementEditor.quantity) {
      setError("Select an item and enter quantity.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await request("/api/v1/admin/inventory/movements", {
        method: "POST",
        body: JSON.stringify({
          ...movementEditor,
          quantity: Number(movementEditor.quantity),
          unitCost: Number(movementEditor.unitCost),
          referenceType: movementEditor.type === "opening" ? "opening" : "manual",
          referenceId: null,
          expiryDate: movementEditor.expiryDate || null,
        }),
      });
      setMovementEditor(null);
      setNotice("Stock movement recorded.");
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update stock.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-w-0 space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#C8102E]">Stock control</p>
          <h1 className="mt-2 text-2xl font-black text-[#173044] sm:text-3xl">Inventory Management</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7d726a]">Track ingredients, stock levels, costs, wastage and every movement across TRS.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button onClick={() => void loadData()} className="rounded-xl border border-[#ded3ca] bg-white px-4 py-3 text-xs font-black text-[#173044]">Refresh</button>
          {canManage && <button onClick={() => setItemEditor({ item: null, form: emptyItem })} className="rounded-xl bg-[#C8102E] px-4 py-3 text-xs font-black text-white">Add inventory item</button>}
        </div>
      </header>

      {(error || notice) && <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{error || notice}</div>}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SummaryCard label="Active items" value={summary.totalItems} />
        <SummaryCard label="Stock value" value={money.format(summary.totalStockValue)} />
        <SummaryCard label="Low stock" value={summary.lowStockItems} alert={summary.lowStockItems > 0} />
        <SummaryCard label="Out of stock" value={summary.outOfStockItems} alert={summary.outOfStockItems > 0} />
      </div>

      <section className="overflow-hidden rounded-3xl border border-[#e8ddd4] bg-white shadow-[0_18px_55px_rgba(49,39,31,.07)]">
        <div className="flex gap-2 border-b border-[#eee5de] p-3 sm:p-4">
          <TabButton active={tab === "items"} onClick={() => setTab("items")}>Stock items</TabButton>
          <TabButton active={tab === "movements"} onClick={() => setTab("movements")}>Movement history</TabButton>
          {canManage && <button onClick={() => setMovementEditor({ ...emptyMovement, inventoryItemId: items[0]?._id ?? "" })} className="ml-auto rounded-xl bg-[#173044] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white sm:px-4">Update stock</button>}
        </div>

        {tab === "items" ? (
          <>
            <div className="grid gap-3 border-b border-[#eee5de] p-4 md:grid-cols-2 xl:grid-cols-4">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, SKU or category" className="min-w-0 rounded-xl border border-[#ded3ca] px-4 py-3 text-sm outline-none focus:border-[#C8102E]" />
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="min-w-0 rounded-xl border border-[#ded3ca] px-4 py-3 text-sm"><option value="">All categories</option>{categories.map((entry) => <option key={entry}>{entry}</option>)}</select>
              <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value as typeof stockFilter)} className="min-w-0 rounded-xl border border-[#ded3ca] px-4 py-3 text-sm"><option value="all">All stock levels</option><option value="low">Low stock</option><option value="out">Out of stock</option></select>
              <select value={itemStatus} onChange={(event) => setItemStatus(event.target.value as typeof itemStatus)} className="min-w-0 rounded-xl border border-[#ded3ca] px-4 py-3 text-sm"><option value="active">Active items</option><option value="archived">Archived items</option><option value="all">All items</option></select>
            </div>
            {loading ? <LoadingState /> : filteredItems.length === 0 ? <EmptyState text="No inventory items match these filters." /> : (
              <>
                <div className="hidden overflow-x-auto xl:block">
                  <table className="w-full min-w-[960px] text-left">
                    <thead className="bg-[#fffaf6] text-[10px] font-black uppercase tracking-wider text-[#8c8178]"><tr><th className="px-5 py-4">Item</th><th className="px-5 py-4">Category</th><th className="px-5 py-4">Current stock</th><th className="px-5 py-4">Reorder / ideal</th><th className="px-5 py-4">Average cost</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Action</th></tr></thead>
                    <tbody className="divide-y divide-[#f0e8e1]">{filteredItems.map((item) => <InventoryRow key={item._id} item={item} canManage={canManage} saving={saving} onEdit={() => openEdit(item)} onMovement={() => setMovementEditor({ ...emptyMovement, inventoryItemId: item._id })} onArchive={() => requestArchiveItem(item)} onRestore={() => void restoreItem(item)} onPermanentDelete={() => requestPermanentDeleteItem(item)} />)}</tbody>
                  </table>
                </div>
                <div className="grid gap-3 p-3 sm:grid-cols-2 xl:hidden">{filteredItems.map((item) => <InventoryCard key={item._id} item={item} canManage={canManage} saving={saving} onEdit={() => openEdit(item)} onMovement={() => setMovementEditor({ ...emptyMovement, inventoryItemId: item._id })} onArchive={() => requestArchiveItem(item)} onRestore={() => void restoreItem(item)} onPermanentDelete={() => requestPermanentDeleteItem(item)} />)}</div>
              </>
            )}
          </>
        ) : loading ? <LoadingState /> : movements.length === 0 ? <EmptyState text="No stock movements have been recorded." /> : <MovementList movements={movements} />}
      </section>

      <AnimatePresence>
        {itemEditor && <ItemDrawer editor={itemEditor} saving={saving} onChange={(form) => setItemEditor({ ...itemEditor, form })} onClose={() => setItemEditor(null)} onSave={() => void saveItem()} />}
        {movementEditor && <MovementDrawer form={movementEditor} items={items} saving={saving} onChange={setMovementEditor} onClose={() => setMovementEditor(null)} onSave={() => void saveMovement()} />}
        {actionDialog && (
          <InventoryActionModal
            dialog={actionDialog}
            saving={saving}
            onConfirmationTextChange={(confirmationText) =>
              setActionDialog((current) =>
                current ? { ...current, confirmationText } : current,
              )
            }
            onClose={() => {
              if (!saving) setActionDialog(null);
            }}
            onConfirm={() => void confirmInventoryAction()}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function InventoryActionModal({
  dialog,
  saving,
  onConfirmationTextChange,
  onClose,
  onConfirm,
}: {
  dialog: InventoryActionDialog;
  saving: boolean;
  onConfirmationTextChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const isPermanentDelete = dialog.type === "permanent-delete";
  const canConfirm =
    !saving &&
    (!isPermanentDelete || dialog.confirmationText === "DELETE");

  return (
    <motion.div
      className="fixed inset-0 z-[120] grid place-items-end bg-black/55 p-0 backdrop-blur-sm sm:place-items-center sm:p-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={onClose}
      role="presentation"
    >
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="inventory-action-title"
        aria-describedby="inventory-action-description"
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full overflow-hidden rounded-t-[28px] border border-white/10 bg-[#fffdfb] shadow-2xl sm:max-w-lg sm:rounded-[28px]"
        initial={{ y: 50, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 50, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.2 }}
      >
        <div
          className={`h-1.5 w-full ${
            isPermanentDelete
              ? "bg-red-700"
              : "bg-gradient-to-r from-[#C8102E] via-[#E8A53A] to-[#173044]"
          }`}
        />

        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-xl font-black ${
                isPermanentDelete
                  ? "bg-red-100 text-red-700"
                  : "bg-[#fff0e8] text-[#C8102E]"
              }`}
              aria-hidden="true"
            >
              {isPermanentDelete ? "!" : "↘"}
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#C8102E]">
                Inventory control
              </p>
              <h2
                id="inventory-action-title"
                className="mt-1 break-words text-xl font-black text-[#173044]"
              >
                {isPermanentDelete
                  ? "Permanently delete item?"
                  : "Archive inventory item?"}
              </h2>
              <p
                id="inventory-action-description"
                className="mt-2 text-sm leading-6 text-[#756b63]"
              >
                {isPermanentDelete
                  ? `"${dialog.item.name}" will be permanently removed. This cannot be undone. The system will block deletion if historical or operational records still reference it.`
                  : `"${dialog.item.name}" will be removed from active inventory, daily stock counts and purchase requirements. Historical movements and reports will remain available.`}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              aria-label="Close confirmation"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#e5dbd3] text-lg text-[#655d57] transition hover:bg-[#f7f0ea] disabled:opacity-50"
            >
              ×
            </button>
          </div>

          <div className="mt-5 rounded-2xl border border-[#eadfd6] bg-[#fffaf6] p-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="font-black uppercase tracking-wider text-[#9a8f87]">
                  Item
                </p>
                <p className="mt-1 break-words font-black text-[#173044]">
                  {dialog.item.name}
                </p>
              </div>
              <div>
                <p className="font-black uppercase tracking-wider text-[#9a8f87]">
                  SKU
                </p>
                <p className="mt-1 break-words font-black text-[#173044]">
                  {dialog.item.sku}
                </p>
              </div>
            </div>
          </div>

          {isPermanentDelete ? (
            <label className="mt-5 block">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-[#756b63]">
                Type DELETE to confirm
              </span>
              <input
                autoFocus
                value={dialog.confirmationText}
                onChange={(event) =>
                  onConfirmationTextChange(event.currentTarget.value)
                }
                placeholder="DELETE"
                autoComplete="off"
                className="h-12 w-full rounded-xl border border-red-200 bg-white px-4 text-sm font-black uppercase tracking-[.12em] text-red-700 outline-none transition placeholder:text-red-300 focus:border-red-600 focus:ring-4 focus:ring-red-100"
              />
              <p className="mt-2 text-xs leading-5 text-red-700/75">
                Use permanent deletion only for unused test records. Operational
                inventory should normally remain archived.
              </p>
            </label>
          ) : (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-900">
              You can restore this item later from the Archived Items filter.
            </div>
          )}
        </div>

        <footer className="grid grid-cols-2 gap-3 border-t border-[#eee4dc] bg-white p-4 sm:flex sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-12 rounded-xl border border-[#ded3ca] px-5 text-xs font-black text-[#173044] transition hover:bg-[#f7f0ea] disabled:opacity-50"
          >
            Keep item
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className={`h-12 rounded-xl px-5 text-xs font-black text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-40 ${
              isPermanentDelete
                ? "bg-red-700 hover:bg-red-800"
                : "bg-[#C8102E] hover:bg-[#a90d27]"
            }`}
          >
            {saving
              ? "Processing…"
              : isPermanentDelete
                ? "Permanently delete"
                : "Archive item"}
          </button>
        </footer>
      </motion.section>
    </motion.div>
  );
}

function SummaryCard({ label, value, alert = false }: { label: string; value: string | number; alert?: boolean }) {
  return <div className="rounded-2xl border border-[#e8ddd4] bg-white p-4 sm:p-5"><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#8c8178]">{label}</p><p className={`mt-3 break-words text-xl font-black sm:text-2xl ${alert ? "text-[#C8102E]" : "text-[#173044]"}`}>{value}</p></div>;
}
function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) { return <button onClick={onClick} className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider sm:px-4 ${active ? "bg-[#fff0e8] text-[#C8102E]" : "text-[#786e66]"}`}>{children}</button>; }
function statusOf(item: InventoryItem) { if (!item.isActive) return { label: "Inactive", cls: "bg-slate-100 text-slate-600" }; if (item.currentStock <= 0) return { label: "Out of stock", cls: "bg-red-50 text-red-700" }; if (item.currentStock <= item.reorderLevel) return { label: "Low stock", cls: "bg-amber-50 text-amber-700" }; return { label: "Healthy", cls: "bg-emerald-50 text-emerald-700" }; }
function InventoryRow({ item, canManage, saving, onEdit, onMovement, onArchive, onRestore, onPermanentDelete }: { item: InventoryItem; canManage: boolean; saving: boolean; onEdit: () => void; onMovement: () => void; onArchive: () => void; onRestore: () => void; onPermanentDelete: () => void }) {
  const status = statusOf(item);
  return <tr className={!item.isActive ? "bg-slate-50/70" : ""}><td className="px-5 py-4"><b className="block text-sm text-[#173044]">{item.name}</b><span className="text-[10px] font-bold text-[#968a81]">{item.sku}</span></td><td className="px-5 py-4 text-xs font-bold text-[#655d57]">{item.category}</td><td className="px-5 py-4"><b className="text-sm text-[#173044]">{item.currentStock}</b> <span className="text-xs text-[#8c8178]">{item.unit}</span></td><td className="px-5 py-4 text-xs text-[#655d57]">{item.reorderLevel} / {item.idealStockLevel} {item.unit}</td><td className="px-5 py-4 text-xs font-bold text-[#173044]">{money.format(item.averageUnitCost)}/{item.unit}</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-[9px] font-black uppercase ${status.cls}`}>{status.label}</span></td><td className="px-5 py-4"><div className="flex flex-wrap justify-end gap-2">{canManage && (item.isActive ? <><button disabled={saving} onClick={onMovement} className="rounded-lg border border-[#ded3ca] px-3 py-2 text-[10px] font-black disabled:opacity-50">Stock</button><button disabled={saving} onClick={onEdit} className="rounded-lg bg-[#173044] px-3 py-2 text-[10px] font-black text-white disabled:opacity-50">Edit</button><button disabled={saving} onClick={onArchive} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-black text-red-700 disabled:opacity-50">Delete</button></> : <><button disabled={saving} onClick={onRestore} className="rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-black text-white disabled:opacity-50">Restore</button><button disabled={saving} onClick={onPermanentDelete} className="rounded-lg bg-red-700 px-3 py-2 text-[10px] font-black text-white disabled:opacity-50">Permanent delete</button></>)}</div></td></tr>;
}
function InventoryCard({ item, canManage, saving, onEdit, onMovement, onArchive, onRestore, onPermanentDelete }: { item: InventoryItem; canManage: boolean; saving: boolean; onEdit: () => void; onMovement: () => void; onArchive: () => void; onRestore: () => void; onPermanentDelete: () => void }) {
  const status = statusOf(item);
  return <article className={`min-w-0 rounded-2xl border p-4 ${item.isActive ? "border-[#eee4dc]" : "border-slate-200 bg-slate-50"}`}><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-black text-[#173044]">{item.name}</h3><p className="mt-1 truncate text-[10px] font-bold text-[#8c8178]">{item.sku} · {item.category}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[8px] font-black uppercase ${status.cls}`}>{status.label}</span></div><div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-[#fffaf6] p-3"><div><p className="text-[8px] font-black uppercase text-[#968a81]">Current</p><b className="mt-1 block text-base text-[#173044]">{item.currentStock} {item.unit}</b></div><div><p className="text-[8px] font-black uppercase text-[#968a81]">Reorder level</p><b className="mt-1 block text-base text-[#173044]">{item.reorderLevel} {item.unit}</b></div></div>{canManage && (item.isActive ? <div className="mt-3 grid grid-cols-3 gap-2"><button disabled={saving} onClick={onMovement} className="rounded-xl border border-[#ded3ca] px-2 py-2 text-[9px] font-black disabled:opacity-50">Stock</button><button disabled={saving} onClick={onEdit} className="rounded-xl bg-[#173044] px-2 py-2 text-[9px] font-black text-white disabled:opacity-50">Edit</button><button disabled={saving} onClick={onArchive} className="rounded-xl border border-red-200 bg-red-50 px-2 py-2 text-[9px] font-black text-red-700 disabled:opacity-50">Delete</button></div> : <div className="mt-3 grid grid-cols-2 gap-2"><button disabled={saving} onClick={onRestore} className="rounded-xl bg-emerald-600 px-3 py-2 text-[10px] font-black text-white disabled:opacity-50">Restore item</button><button disabled={saving} onClick={onPermanentDelete} className="rounded-xl bg-red-700 px-3 py-2 text-[10px] font-black text-white disabled:opacity-50">Permanent delete</button></div>)}</article>;
}
function MovementList({ movements }: { movements: InventoryMovement[] }) { return <div className="divide-y divide-[#eee5de]">{movements.map((movement) => { const item = typeof movement.inventoryItemId === "string" ? null : movement.inventoryItemId; return <div key={movement._id} className="grid gap-2 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:px-5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><b className="truncate text-sm text-[#173044]">{item?.name ?? "Inventory item"}</b><span className="rounded-full bg-[#fff0e8] px-2 py-1 text-[8px] font-black uppercase text-[#C8102E]">{movement.type.replaceAll("_", " ")}</span></div><p className="mt-1 text-[10px] font-bold text-[#8c8178]">{item?.sku ?? ""} · {new Date(movement.createdAt).toLocaleString("en-IN")}</p>{movement.reason && <p className="mt-2 text-xs text-[#6f655e]">{movement.reason}</p>}</div><div className="text-left sm:text-right"><b className="text-sm text-[#173044]">{movement.stockBefore} → {movement.stockAfter} {item?.unit ?? ""}</b><p className="mt-1 text-[10px] font-bold text-[#8c8178]">Quantity: {movement.quantity}{movement.totalCost > 0 ? ` · ${money.format(movement.totalCost)}` : ""}</p></div></div>; })}</div>; }
function LoadingState() { return <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-36 animate-pulse rounded-2xl bg-[#f5eee8]" />)}</div>; }
function EmptyState({ text }: { text: string }) { return <div className="px-5 py-20 text-center"><p className="text-sm font-bold text-[#8c8178]">{text}</p></div>; }

function ItemDrawer({ editor, saving, onChange, onClose, onSave }: { editor: { item: InventoryItem | null; form: ItemForm }; saving: boolean; onChange: (form: ItemForm) => void; onClose: () => void; onSave: () => void }) {
  const { form } = editor;
  const set = <K extends keyof ItemForm>(key: K, value: ItemForm[K]) => onChange({ ...form, [key]: value });
  return <Drawer title={editor.item ? "Edit inventory item" : "Create inventory item"} onClose={onClose} footer={<><button onClick={onClose} className="rounded-xl border border-[#ded3ca] px-5 py-3 text-xs font-black">Cancel</button><button disabled={saving} onClick={onSave} className="rounded-xl bg-[#C8102E] px-5 py-3 text-xs font-black text-white disabled:opacity-50">{saving ? "Saving…" : "Save item"}</button></>}><div className="grid gap-4 sm:grid-cols-2"><Field label="Item name *"><input value={form.name} onChange={(e) => set("name", e.target.value)} /></Field><Field label="SKU *"><input value={form.sku} onChange={(e) => set("sku", e.target.value.toUpperCase())} /></Field><Field label="Category *"><input value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="Cheese, vegetables, packaging…" /></Field><Field label="Stock unit"><select value={form.unit} onChange={(e) => set("unit", e.target.value as Unit)}>{units.map((unit) => <option key={unit}>{unit}</option>)}</select></Field>{!editor.item && <Field label="Opening stock"><input type="number" min="0" step="any" value={form.currentStock} onChange={(e) => set("currentStock", e.target.value)} /></Field>}<Field label="Reorder level"><input type="number" min="0" step="any" value={form.reorderLevel} onChange={(e) => set("reorderLevel", e.target.value)} /></Field><Field label="Ideal stock level"><input type="number" min="0" step="any" value={form.idealStockLevel} onChange={(e) => set("idealStockLevel", e.target.value)} /></Field><Field label="Average cost per unit"><input type="number" min="0" step="any" value={form.averageUnitCost} onChange={(e) => set("averageUnitCost", e.target.value)} /></Field><label className="flex items-center gap-3 rounded-xl border border-[#e4dad2] p-4 text-xs font-bold text-[#173044]"><input type="checkbox" checked={form.expiryTrackingEnabled} onChange={(e) => set("expiryTrackingEnabled", e.target.checked)} /> Track batch expiry</label><label className="flex items-center gap-3 rounded-xl border border-[#e4dad2] p-4 text-xs font-bold text-[#173044]"><input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} /> Active inventory item</label><div className="sm:col-span-2"><Field label="Internal notes"><textarea rows={4} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></Field></div></div></Drawer>;
}
function MovementDrawer({ form, items, saving, onChange, onClose, onSave }: { form: MovementForm; items: InventoryItem[]; saving: boolean; onChange: (form: MovementForm) => void; onClose: () => void; onSave: () => void }) {
  const set = <K extends keyof MovementForm>(key: K, value: MovementForm[K]) => onChange({ ...form, [key]: value });
  const selected = items.find((item) => item._id === form.inventoryItemId);
  const inbound = ["opening", "purchase", "adjustment_in", "return_in"].includes(form.type);
  return <Drawer title="Update stock" onClose={onClose} footer={<><button onClick={onClose} className="rounded-xl border border-[#ded3ca] px-5 py-3 text-xs font-black">Cancel</button><button disabled={saving} onClick={onSave} className="rounded-xl bg-[#C8102E] px-5 py-3 text-xs font-black text-white disabled:opacity-50">{saving ? "Saving…" : "Record movement"}</button></>}><div className="space-y-4"><Field label="Inventory item"><select value={form.inventoryItemId} onChange={(e) => set("inventoryItemId", e.target.value)}><option value="">Select item</option>{items.filter((item) => item.isActive).map((item) => <option key={item._id} value={item._id}>{item.name} ({item.currentStock} {item.unit})</option>)}</select></Field>{selected && <div className="rounded-xl bg-[#fff5ee] p-4 text-xs font-bold text-[#6c5e54]">Current stock: <span className="text-[#C8102E]">{selected.currentStock} {selected.unit}</span></div>}<div className="grid gap-4 sm:grid-cols-2"><Field label="Movement type"><select value={form.type} onChange={(e) => set("type", e.target.value as MovementType)}>{movementTypes.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select></Field><Field label={`Quantity${selected ? ` (${selected.unit})` : ""}`}><input type="number" min="0.0001" step="any" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} /></Field>{inbound && <Field label="Unit cost"><input type="number" min="0" step="any" value={form.unitCost} onChange={(e) => set("unitCost", e.target.value)} /></Field>}<Field label="Batch number"><input value={form.batchNumber} onChange={(e) => set("batchNumber", e.target.value)} /></Field>{selected?.expiryTrackingEnabled && inbound && <Field label="Expiry date"><input type="date" min={todayInputValue()} value={form.expiryDate} onChange={(e) => set("expiryDate", e.target.value)} /></Field>}</div><Field label="Reason / note"><textarea rows={4} value={form.reason} onChange={(e) => set("reason", e.target.value)} placeholder="Why is this stock being added or removed?" /></Field></div></Drawer>;
}
function Drawer({ title, onClose, footer, children }: { title: string; onClose: () => void; footer: React.ReactNode; children: ReactNode }) { return <motion.div className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}><motion.section onMouseDown={(event) => event.stopPropagation()} className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-3xl bg-[#fffdfb] shadow-2xl sm:inset-y-0 sm:left-auto sm:w-[620px] sm:rounded-none" initial={{ y: 70, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 70, opacity: 0 }}><header className="flex items-center justify-between border-b border-[#eee4dc] p-5"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-[#C8102E]">Inventory editor</p><h2 className="mt-1 text-xl font-black text-[#173044]">{title}</h2></div><button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-[#e5dbd3] text-lg">×</button></header><div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div><footer className="flex flex-col-reverse gap-2 border-t border-[#eee4dc] bg-white p-4 sm:flex-row sm:justify-end">{footer}</footer></motion.section></motion.div>; }
function Field({ label, children }: { label: string; children: ReactElement<{ className?: string }> }) { return <label className="block text-[10px] font-black uppercase tracking-wider text-[#756b63]"><span className="mb-2 block">{label}</span>{cloneElement(children, { className: `${children.props.className ?? ""} w-full min-w-0 rounded-xl border border-[#ded3ca] bg-white px-4 py-3 text-sm font-medium normal-case tracking-normal text-[#173044] outline-none focus:border-[#C8102E]` })}</label>; }
