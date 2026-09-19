"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AnimatePresence } from "framer-motion";

import { emptyItem, emptyMovement, money, type InventoryItem, type InventoryMovement, type Summary, type ItemForm, type MovementForm, type InventoryActionDialog } from "@/components/admin/inventory/admin-inventory.types";

import { fetchInventoryData, saveInventoryItem, archiveInventoryItem, restoreInventoryItem, permanentlyDeleteInventoryItem, saveInventoryMovement } from "@/components/admin/inventory/admin-inventory.api";
import { ItemDrawer } from "@/components/admin/inventory/ItemDrawer";
import { MovementDrawer } from "@/components/admin/inventory/MovementDrawer";
import { InventoryCard, InventoryRow, MovementList } from "@/components/admin/inventory/InventoryLists";
import { EmptyState, InventoryActionModal, LoadingState, SummaryCard, TabButton } from "@/components/admin/inventory/InventoryUi";
export function AdminInventoryClient({ canManage }: { canManage: boolean }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalItems: 0,
    totalStockValue: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
  });
  const [tab, setTab] = useState<"items" | "movements">("items");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");
  const [itemStatus, setItemStatus] = useState<"active" | "archived" | "all">(
    "active",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [itemEditor, setItemEditor] = useState<{
    item: InventoryItem | null;
    form: ItemForm;
  } | null>(null);
  const [movementEditor, setMovementEditor] = useState<MovementForm | null>(
    null,
  );
  const [actionDialog, setActionDialog] =
    useState<InventoryActionDialog | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchInventoryData();
      setItems(data.items);
      setMovements(data.movements);
      setSummary(data.summary);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to load inventory.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const categories = useMemo(
    () =>
      Array.from(new Set(items.map((item) => item.category))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [items],
  );
  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      if (
        term &&
        !`${item.name} ${item.sku} ${item.category}`
          .toLowerCase()
          .includes(term)
      )
        return false;
      if (category && item.category !== category) return false;
      if (itemStatus === "active" && !item.isActive) return false;
      if (itemStatus === "archived" && item.isActive) return false;
      if (stockFilter === "low" && item.currentStock > item.reorderLevel)
        return false;
      if (stockFilter === "out" && item.currentStock > 0) return false;
      return true;
    });
  }, [items, search, category, stockFilter, itemStatus]);

  const openEdit = (item: InventoryItem) =>
    setItemEditor({
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
      await saveInventoryItem(item, form);
      setItemEditor(null);
      setNotice(item ? "Inventory item updated." : "Inventory item created.");
      await loadData();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to save item.",
      );
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
      await archiveInventoryItem(item._id);
      setActionDialog(null);
      setNotice(`${item.name} was archived.`);
      await loadData();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to archive inventory item.",
      );
    } finally {
      setSaving(false);
    }
  };

  const restoreItem = async (item: InventoryItem) => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await restoreInventoryItem(item._id);
      setNotice(`${item.name} was restored.`);
      await loadData();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to restore inventory item.",
      );
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
      await permanentlyDeleteInventoryItem(item._id);
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
      await saveInventoryMovement(movementEditor);
      setMovementEditor(null);
      setNotice("Stock movement recorded.");
      await loadData();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to update stock.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-w-0 space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#C8102E]">
            Stock control
          </p>
          <h1 className="mt-2 text-2xl font-black text-[#173044] sm:text-3xl">
            Inventory Management
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7d726a]">
            Track ingredients, stock levels, costs, wastage and every movement
            across TRS.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button
            onClick={() => void loadData()}
            className="rounded-xl border border-[#ded3ca] bg-white px-4 py-3 text-xs font-black text-[#173044]"
          >
            Refresh
          </button>
          {canManage && (
            <button
              onClick={() => setItemEditor({ item: null, form: emptyItem })}
              className="rounded-xl bg-[#C8102E] px-4 py-3 text-xs font-black text-white"
            >
              Add inventory item
            </button>
          )}
        </div>
      </header>

      {(error || notice) && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-bold ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
        >
          {error || notice}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SummaryCard label="Active items" value={summary.totalItems} />
        <SummaryCard
          label="Stock value"
          value={money.format(summary.totalStockValue)}
        />
        <SummaryCard
          label="Low stock"
          value={summary.lowStockItems}
          alert={summary.lowStockItems > 0}
        />
        <SummaryCard
          label="Out of stock"
          value={summary.outOfStockItems}
          alert={summary.outOfStockItems > 0}
        />
      </div>

      <section className="overflow-hidden rounded-3xl border border-[#e8ddd4] bg-white shadow-[0_18px_55px_rgba(49,39,31,.07)]">
        <div className="flex gap-2 border-b border-[#eee5de] p-3 sm:p-4">
          <TabButton active={tab === "items"} onClick={() => setTab("items")}>
            Stock items
          </TabButton>
          <TabButton
            active={tab === "movements"}
            onClick={() => setTab("movements")}
          >
            Movement history
          </TabButton>
          {canManage && (
            <button
              onClick={() =>
                setMovementEditor({
                  ...emptyMovement,
                  inventoryItemId: items[0]?._id ?? "",
                })
              }
              className="ml-auto rounded-xl bg-[#173044] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white sm:px-4"
            >
              Update stock
            </button>
          )}
        </div>

        {tab === "items" ? (
          <>
            <div className="grid gap-3 border-b border-[#eee5de] p-4 md:grid-cols-2 xl:grid-cols-4">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, SKU or category"
                className="min-w-0 rounded-xl border border-[#ded3ca] px-4 py-3 text-sm outline-none focus:border-[#C8102E]"
              />
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="min-w-0 rounded-xl border border-[#ded3ca] px-4 py-3 text-sm"
              >
                <option value="">All categories</option>
                {categories.map((entry) => (
                  <option key={entry}>{entry}</option>
                ))}
              </select>
              <select
                value={stockFilter}
                onChange={(event) =>
                  setStockFilter(event.target.value as typeof stockFilter)
                }
                className="min-w-0 rounded-xl border border-[#ded3ca] px-4 py-3 text-sm"
              >
                <option value="all">All stock levels</option>
                <option value="low">Low stock</option>
                <option value="out">Out of stock</option>
              </select>
              <select
                value={itemStatus}
                onChange={(event) =>
                  setItemStatus(event.target.value as typeof itemStatus)
                }
                className="min-w-0 rounded-xl border border-[#ded3ca] px-4 py-3 text-sm"
              >
                <option value="active">Active items</option>
                <option value="archived">Archived items</option>
                <option value="all">All items</option>
              </select>
            </div>
            {loading ? (
              <LoadingState />
            ) : filteredItems.length === 0 ? (
              <EmptyState text="No inventory items match these filters." />
            ) : (
              <>
                <div className="hidden overflow-x-auto xl:block">
                  <table className="w-full min-w-[960px] text-left">
                    <thead className="bg-[#fffaf6] text-[10px] font-black uppercase tracking-wider text-[#8c8178]">
                      <tr>
                        <th className="px-5 py-4">Item</th>
                        <th className="px-5 py-4">Category</th>
                        <th className="px-5 py-4">Current stock</th>
                        <th className="px-5 py-4">Reorder / ideal</th>
                        <th className="px-5 py-4">Average cost</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0e8e1]">
                      {filteredItems.map((item) => (
                        <InventoryRow
                          key={item._id}
                          item={item}
                          canManage={canManage}
                          saving={saving}
                          onEdit={() => openEdit(item)}
                          onMovement={() =>
                            setMovementEditor({
                              ...emptyMovement,
                              inventoryItemId: item._id,
                            })
                          }
                          onArchive={() => requestArchiveItem(item)}
                          onRestore={() => void restoreItem(item)}
                          onPermanentDelete={() =>
                            requestPermanentDeleteItem(item)
                          }
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="grid gap-3 p-3 sm:grid-cols-2 xl:hidden">
                  {filteredItems.map((item) => (
                    <InventoryCard
                      key={item._id}
                      item={item}
                      canManage={canManage}
                      saving={saving}
                      onEdit={() => openEdit(item)}
                      onMovement={() =>
                        setMovementEditor({
                          ...emptyMovement,
                          inventoryItemId: item._id,
                        })
                      }
                      onArchive={() => requestArchiveItem(item)}
                      onRestore={() => void restoreItem(item)}
                      onPermanentDelete={() => requestPermanentDeleteItem(item)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : loading ? (
          <LoadingState />
        ) : movements.length === 0 ? (
          <EmptyState text="No stock movements have been recorded." />
        ) : (
          <MovementList movements={movements} />
        )}
      </section>

      <AnimatePresence>
        {itemEditor && (
          <ItemDrawer
            editor={itemEditor}
            saving={saving}
            onChange={(form) => setItemEditor({ ...itemEditor, form })}
            onClose={() => setItemEditor(null)}
            onSave={() => void saveItem()}
          />
        )}
        {movementEditor && (
          <MovementDrawer
            form={movementEditor}
            items={items}
            saving={saving}
            onChange={setMovementEditor}
            onClose={() => setMovementEditor(null)}
            onSave={() => void saveMovement()}
          />
        )}
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
