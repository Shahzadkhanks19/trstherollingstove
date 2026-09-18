"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRotateLeft,
  faBagShopping,
  faBars,
  faCashRegister,
  faChevronRight,
  faClock,
  faMagnifyingGlass,
  faMinus,
  faReceipt,
  faTrash,
  faPause,
  faFolderOpen,
  faXmark,
  faUser,
  faUserPlus,
  faPhone,
  faPlus,
  faUtensils,
  faTableColumns,
} from "@fortawesome/free-solid-svg-icons";
import { calculatePosCartTotals } from "@/lib/pos/cart";
import { posCartActions, usePosCart } from "@/lib/pos/cart-store";
import { PosBillingModal } from "@/components/admin/pos/PosBillingModal";
import { CategoryRail, NumberField, ProductCard, SelectField, SummaryRow } from "@/components/admin/pos/PosWorkspaceUi";
import { PosCashDrawerControl } from "@/components/admin/pos/PosCashDrawerControl";
import { PayLaterOrderModal, type PosTableChoice } from "@/components/admin/pos/PayLaterOrderModal";
import { ItemConfigurator } from "@/components/admin/pos/ItemConfigurator";
import { InternalConsumptionPanel } from "@/components/admin/pos/InternalConsumptionPanel";
import { PosCustomerPanel } from "@/components/admin/pos/PosCustomerPanel";
import {
  flushPosSaleQueue,
  queuedPosSaleCount,
} from "@/lib/pos/sale-offline-queue";
import { readPosPrintSettings } from "@/lib/pos/print-settings";
import { CustomActionModal } from "@/components/admin/CustomActionModal";
import type {
  PosCartLine,
  PosCartState,
  PosCartTotals,
  PosDiscountType,
  PosTaxMode,
  PosCatalogItem,
  PosCategory,
  PosOrderType,
  PosSaleType,
  PosInternalConsumption,
  PosCustomer,
} from "@/types/pos";

type HeldOrder = {
  id: string;
  title: string;
  cart: PosCartState;
  itemCount: number;
  grandTotal: number;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse<T> = { success: boolean; message: string; data: T };
type EditingRunningOrder = {
  id: string;
  ticketNumber: string;
  cart: PosCartState;
  guestCount: number;
};
type PendingPosAction =
  | { kind: "clear" }
  | { kind: "hold" }
  | { kind: "recall"; order: HeldOrder }
  | { kind: "delete-held"; order: HeldOrder }
  | null;

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function PosWorkspace({
  categories,
  items,
  cashierName,
  defaultTaxRate,
  defaultTaxMode,
}: {
  categories: PosCategory[];
  items: PosCatalogItem[];
  cashierName: string;
  defaultTaxRate: number;
  defaultTaxMode: PosTaxMode;
}) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("all");
  const [query, setQuery] = useState("");
  const cart = usePosCart();
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false);
  const [configuringItem, setConfiguringItem] = useState<PosCatalogItem | null>(
    null,
  );
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [heldOrdersOpen, setHeldOrdersOpen] = useState(false);
  const [heldLoading, setHeldLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [billingOpen, setBillingOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingPosAction>(null);
  const [runningOrderOpen, setRunningOrderOpen] = useState(false);
  const [runningTables, setRunningTables] = useState<PosTableChoice[]>([]);
  const [runningShiftId, setRunningShiftId] = useState("");
  const [editingRunningOrder, setEditingRunningOrder] =
    useState<EditingRunningOrder | null>(null);
  const [queuedSales, setQueuedSales] = useState(0);

  useEffect(() => {
    if (cart.lines.length > 0) return;
    const rateMatches =
      Math.abs(cart.adjustments.taxRate - defaultTaxRate) < 0.001;
    if (rateMatches && cart.adjustments.taxMode === defaultTaxMode) return;
    posCartActions.updateAdjustments({
      taxRate: defaultTaxRate,
      taxMode: defaultTaxMode,
    });
  }, [
    cart.adjustments.taxMode,
    cart.adjustments.taxRate,
    cart.lines.length,
    defaultTaxMode,
    defaultTaxRate,
  ]);

  useEffect(() => {
    let active = true;
    const updateCount = () => {
      if (active) setQueuedSales(queuedPosSaleCount());
    };
    const sync = async () => {
      const completed = await flushPosSaleQueue();
      if (!active) return;
      updateCount();
      if (completed.length)
        setStatusMessage(
          `${completed.length} offline sale${completed.length === 1 ? "" : "s"} synced. Open Bill History to print KOT and invoice.`,
        );
    };
    const timer = window.setTimeout(() => {
      updateCount();
      void sync();
    }, 0);
    const interval = window.setInterval(() => void sync(), 30000);
    window.addEventListener("online", sync);
    window.addEventListener("trs-pos-offline-sales-changed", updateCount);
    return () => {
      active = false;
      window.clearTimeout(timer);
      window.clearInterval(interval);
      window.removeEventListener("online", sync);
      window.removeEventListener("trs-pos-offline-sales-changed", updateCount);
    };
  }, []);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return items.filter((item) => {
      const categoryMatches =
        activeCategory === "all" || item.categoryId === activeCategory;
      const searchMatches =
        !normalizedQuery ||
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.shortDescription.toLowerCase().includes(normalizedQuery) ||
        item.categoryName.toLowerCase().includes(normalizedQuery);

      return categoryMatches && searchMatches;
    });
  }, [activeCategory, items, query]);

  const totals = useMemo(() => calculatePosCartTotals(cart), [cart]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const runningRaw = window.localStorage.getItem(
        "trs-pos-edit-running-order",
      );
      if (runningRaw) {
        try {
          const parsed = JSON.parse(runningRaw) as EditingRunningOrder;
          if (!parsed.id || !parsed.ticketNumber || !parsed.cart?.lines?.length)
            throw new Error("Invalid running order edit payload.");
          posCartActions.replace(parsed.cart);
          setEditingRunningOrder(parsed);
          setStatusMessage(
            `${parsed.ticketNumber} loaded for modification. Save changes to regenerate the kitchen KOT.`,
          );
          return;
        } catch {
          window.localStorage.removeItem("trs-pos-edit-running-order");
          setStatusMessage(
            "Unable to load the running order for modification.",
          );
          return;
        }
      }

      const rebillRaw = window.localStorage.getItem("trs-pos-rebill-order");
      if (!rebillRaw) return;
      try {
        const parsed = JSON.parse(rebillRaw) as {
          cart: PosCartState;
          orderNumber: string;
        };
        if (!parsed.orderNumber || !parsed.cart?.lines?.length)
          throw new Error("Invalid rebill payload.");
        posCartActions.replace(parsed.cart);
        window.localStorage.removeItem("trs-pos-rebill-order");
        setStatusMessage(
          `${parsed.orderNumber} copied for correction. Review the cart and complete a new corrected bill; cancel/refund the original from Bill History if required.`,
        );
      } catch {
        window.localStorage.removeItem("trs-pos-rebill-order");
        setStatusMessage("Unable to load the previous order for correction.");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!mobileCartOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileCartOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileCartOpen]);

  useEffect(() => {
    if (!cart.lines.length) return;
    const timer = window.setTimeout(async () => {
      try {
        await fetch("/api/v1/pos/cart-records/draft", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ cart }),
        });
      } catch {
        // Local storage remains the immediate crash-recovery fallback.
      }
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [cart]);

  async function openRunningOrder() {
    if (!cart.lines.length) return;
    if (editingRunningOrder) {
      setStatusMessage("Saving running order changes...");
      const printSettings = readPosPrintSettings();
      const printWindow = printSettings.autoPrintKot
        ? window.open("", "_blank")
        : null;
      try {
        const response = await fetch(
          `/api/v1/pos/running-orders/${editingRunningOrder.id}`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              cart,
              guestCount: editingRunningOrder.guestCount,
              sendToKitchen: true,
            }),
          },
        );
        const json = (await response.json()) as ApiResponse<{
          kotRevision: { revision: number } | null;
        }>;
        if (!response.ok)
          throw new Error(
            json.message || "Unable to update the running order.",
          );
        if (printWindow) {
          if (json.data.kotRevision) {
            const query = new URLSearchParams({
              revision: String(json.data.kotRevision.revision),
              paper: printSettings.kotPaper,
              copies: String(printSettings.kotCopies),
              customer: String(printSettings.showCustomerOnKot),
              prices: String(printSettings.showPricesOnKot),
            });
            printWindow.location.href = `/api/v1/pos/running-orders/${editingRunningOrder.id}/kot?${query.toString()}`;
          } else {
            printWindow.close();
          }
        }
        window.localStorage.removeItem("trs-pos-edit-running-order");
        setEditingRunningOrder(null);
        posCartActions.clear();
        setStatusMessage(
          json.data.kotRevision
            ? `${editingRunningOrder.ticketNumber} updated. Revision KOT #${json.data.kotRevision.revision} contains only kitchen changes.`
            : `${editingRunningOrder.ticketNumber} saved. No kitchen changes were detected.`,
        );
        window.setTimeout(
          () => router.push("/admin/pos/operations"),
          350,
        );
      } catch (error) {
        printWindow?.close();
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "Unable to update the running order.",
        );
      }
      return;
    }
    setStatusMessage("Loading available tables...");
    try {
      const [shiftResponse, tablesResponse] = await Promise.all([
        fetch("/api/v1/pos/shifts/current", { cache: "no-store" }),
        fetch("/api/v1/pos/tables", { cache: "no-store" }),
      ]);
      const shiftJson = (await shiftResponse.json()) as ApiResponse<{
        _id: string;
      } | null>;
      const tablesJson = (await tablesResponse.json()) as ApiResponse<
        PosTableChoice[]
      >;
      if (!shiftResponse.ok || !shiftJson.data?._id)
        throw new Error("Open a POS shift before creating a pay-later order.");
      if (!tablesResponse.ok)
        throw new Error(tablesJson.message || "Unable to load tables.");
      setRunningShiftId(shiftJson.data._id);
      setRunningTables(
        tablesJson.data.filter(
          (table) =>
            table.status === "available" || table.status === "reserved",
        ),
      );
      setRunningOrderOpen(true);
      setStatusMessage("");
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Unable to open pay-later order.",
      );
    }
  }

  async function createPayLaterOrder(input: {
    tableId: string | null;
    tableName: string;
    guestCount: number;
  }) {
    const printSettings = readPosPrintSettings();
    const printWindow = printSettings.autoPrintKot
      ? window.open("", "_blank")
      : null;
    try {
      const response = await fetch("/api/v1/pos/running-orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ shiftId: runningShiftId, ...input, cart }),
      });
      const json = (await response.json()) as ApiResponse<{
        order: { _id: string; ticketNumber: string };
        kotRevision: { revision: number };
      }>;
      if (!response.ok)
        throw new Error(json.message || "Unable to open pay-later order.");
      if (printWindow) {
        const query = new URLSearchParams({
          revision: String(json.data.kotRevision.revision),
          paper: printSettings.kotPaper,
          copies: String(printSettings.kotCopies),
          customer: String(printSettings.showCustomerOnKot),
          prices: String(printSettings.showPricesOnKot),
        });
        printWindow.location.href = `/api/v1/pos/running-orders/${json.data.order._id}/kot?${query.toString()}`;
      }
      posCartActions.clear();
      setRunningOrderOpen(false);
      setStatusMessage(
        `${json.data.order.ticketNumber} opened as Pay Later and initial KOT printed.`,
      );
      window.setTimeout(
        () => router.push("/admin/pos/operations"),
        350,
      );
    } catch (error) {
      printWindow?.close();
      throw error;
    }
  }

  function cancelRunningOrderEdit() {
    window.localStorage.removeItem("trs-pos-edit-running-order");
    setEditingRunningOrder(null);
    posCartActions.clear();
    setStatusMessage("Running order modification cancelled.");
    router.push("/admin/pos/operations");
  }

  async function loadHeldOrders() {
    setHeldLoading(true);
    setStatusMessage("");
    try {
      const response = await fetch("/api/v1/pos/cart-records", {
        cache: "no-store",
      });
      const json = (await response.json()) as ApiResponse<HeldOrder[]>;
      if (!response.ok)
        throw new Error(json.message || "Unable to load held orders.");
      setHeldOrders(json.data);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Unable to load held orders.",
      );
    } finally {
      setHeldLoading(false);
    }
  }

  async function holdCurrentOrder(title: string) {
    if (!cart.lines.length) return;
    setStatusMessage("Holding order...");
    try {
      const response = await fetch("/api/v1/pos/cart-records", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, cart }),
      });
      const json = (await response.json()) as ApiResponse<{ id: string }>;
      if (!response.ok)
        throw new Error(json.message || "Unable to hold order.");
      posCartActions.clear();
      setStatusMessage("Order held successfully.");
      await loadHeldOrders();
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Unable to hold order.",
      );
    }
  }

  async function recallHeldOrder(order: HeldOrder) {
    posCartActions.replace(order.cart);
    await deleteHeldOrder(order.id);
    setHeldOrdersOpen(false);
    setStatusMessage(`Recalled ${order.title}.`);
  }

  async function deleteHeldOrder(id: string) {
    try {
      const response = await fetch(`/api/v1/pos/cart-records/${id}`, {
        method: "DELETE",
      });
      const json = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok)
        throw new Error(json.message || "Unable to delete held order.");
      setHeldOrders((orders) => orders.filter((order) => order.id !== id));
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Unable to delete held order.",
      );
    }
  }

  const cartPanel = (
    <CartPanel
      cart={cart.lines}
      itemCount={totals.itemCount}
      totals={totals}
      adjustments={cart.adjustments}
      defaultTaxRate={defaultTaxRate}
      defaultTaxMode={defaultTaxMode}
      orderType={cart.orderType}
      orderNote={cart.orderNote}
      customer={cart.customer}
      internalConsumption={cart.internalConsumption}
      cashierName={cashierName}
      onOrderTypeChange={posCartActions.setOrderType}
      onChangeQuantity={posCartActions.changeQuantity}
      onSetQuantity={posCartActions.setQuantity}
      onRemove={posCartActions.removeItem}
      onLineNoteChange={posCartActions.setLineNote}
      onOrderNoteChange={posCartActions.setOrderNote}
      onCustomerChange={posCartActions.setCustomer}
      onInternalConsumptionChange={posCartActions.setInternalConsumption}
      onAdjustmentsChange={posCartActions.updateAdjustments}
      onHold={() => setPendingAction({ kind: "hold" })}
      onOpenHeld={async () => {
        setHeldOrdersOpen(true);
        await loadHeldOrders();
      }}
      heldCount={heldOrders.length}
      statusMessage={statusMessage}
      onBilling={() => {
        setMobileCartOpen(false);
        setBillingOpen(true);
      }}
      onRunningOrder={openRunningOrder}
      runningOrderLabel={
        editingRunningOrder
          ? "Save changes & print revision KOT"
          : "Pay later / running order"
      }
      onClear={() => setPendingAction({ kind: "clear" })}
    />
  );

  return (
    <div className="-m-4 flex h-[calc(100dvh-80px)] min-h-0 flex-col overflow-hidden bg-[#f6f1eb] sm:-m-6 lg:-m-8">
      <header className="z-30 shrink-0 border-b border-[#e8ddd3] bg-[#fffdf9]/95 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#111820] text-[#E8A53A]">
            <FontAwesomeIcon icon={faCashRegister} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[.22em] text-[#C8102E]">
              Counter workspace
            </p>
            <h1 className="truncate text-xl font-black tracking-[-.04em] text-[#122b3c]">
              Point of Sale
            </h1>
          </div>
          <div className="ml-auto hidden items-center gap-2 sm:flex">
            <PosCashDrawerControl />
            <a
              href="/admin/pos/operations"
              className="rounded-xl border border-[#e5d9cf] bg-white px-3 py-2 text-xs font-black text-[#122b3c] transition hover:border-[#C8102E]/40 hover:text-[#C8102E]"
            >
              Running orders
            </a>
            <a
              href="/admin/pos/bills"
              className="rounded-xl border border-[#e5d9cf] bg-white px-3 py-2 text-xs font-black text-[#122b3c]"
            >
              Bill history
            </a>
            <div className="flex items-center gap-2 rounded-2xl bg-[#f3ece5] px-3 py-2 text-xs font-bold text-[#6d625a]">
              <FontAwesomeIcon icon={faClock} className="text-[#C8102E]" />
              {cashierName}
            </div>
          </div>
          <button
            type="button"
            disabled={totals.itemCount === 0}
            onClick={() => {
              if (totals.itemCount > 0) setMobileCartOpen(true);
            }}
            className="relative grid h-11 w-11 place-items-center rounded-2xl bg-[#C8102E] text-white shadow-lg transition disabled:cursor-not-allowed disabled:bg-[#d6cbc3] disabled:shadow-none min-[1400px]:hidden"
            aria-label={
              totals.itemCount > 0
                ? "Open current order"
                : "Current order is empty"
            }
            title={
              totals.itemCount > 0
                ? "Open current order"
                : "Add an item to open the current order"
            }
          >
            <FontAwesomeIcon icon={faReceipt} />
            {totals.itemCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#E8A53A] px-1 text-[9px] font-black text-[#111820]">
                {totals.itemCount}
              </span>
            )}
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:hidden">
          <div className="[&>button]:h-11 [&>button]:w-full [&>button]:justify-center [&>button]:px-2">
            <PosCashDrawerControl />
          </div>
          <a
            href="/admin/pos/bills"
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#e5d9cf] bg-white px-3 text-xs font-black text-[#122b3c]"
          >
            <FontAwesomeIcon icon={faReceipt} className="text-[#C8102E]" />
            Bill history
          </a>
          <a
            href="/admin/pos/operations"
            className="col-span-2 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#173044] px-3 text-xs font-black text-white shadow-sm"
          >
            <FontAwesomeIcon icon={faClock} className="text-[#E8A53A]" />
            Running orders · settle & print
          </a>
        </div>

        {queuedSales > 0 && (
          <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-black text-amber-900">
            {queuedSales} sale{queuedSales === 1 ? "" : "s"} waiting to sync. Do
            not clear browser data or use private mode.
          </p>
        )}

        {editingRunningOrder && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[.16em] text-blue-700">
                Modifying running order
              </p>
              <p className="text-sm font-black text-blue-950">
                {editingRunningOrder.ticketNumber} · Add, remove or change
                items, then save and regenerate the KOT.
              </p>
            </div>
            <button
              type="button"
              onClick={cancelRunningOrderEdit}
              className="rounded-xl border border-blue-300 bg-white px-3 py-2 text-xs font-black text-blue-800"
            >
              Cancel modification
            </button>
          </div>
        )}
      </header>

      <div className="grid min-h-0 flex-1 min-[1400px]:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
        <main className="min-h-0 min-w-0 overflow-y-auto overscroll-contain p-3 sm:p-5 lg:p-6">
          <div className="mb-4 flex gap-3">
            <label className="relative block min-w-0 flex-1">
              <span className="sr-only">Search menu</span>
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9a8e85]"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search food, category or item..."
                className="h-12 w-full rounded-2xl border border-[#e5d9cf] bg-white pl-11 pr-11 text-sm font-semibold text-[#122b3c] outline-none transition focus:border-[#C8102E] focus:ring-4 focus:ring-[#C8102E]/10"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-[#8b7f76] hover:bg-[#f3ece5]"
                  aria-label="Clear search"
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              )}
            </label>
            <button
              type="button"
              onClick={() => setMobileCategoriesOpen(true)}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#e5d9cf] bg-white text-[#122b3c] transition hover:border-[#C8102E]/40 hover:text-[#C8102E] lg:hidden"
              aria-label="Browse categories"
              aria-haspopup="dialog"
              aria-expanded={mobileCategoriesOpen}
            >
              <FontAwesomeIcon icon={faBars} />
            </button>
          </div>

          <div className="hidden lg:block">
            <CategoryRail
              categories={categories}
              activeCategory={activeCategory}
              onSelect={setActiveCategory}
            />
          </div>

          <div className="mb-4 mt-5 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-black tracking-[-.03em] text-[#122b3c]">
                {activeCategory === "all"
                  ? "All items"
                  : (categories.find(
                      (category) => category.id === activeCategory,
                    )?.name ?? "Menu")}
              </h2>
              <p className="mt-1 text-xs font-medium text-[#8b7e75]">
                {filteredItems.length} items available in this view
              </p>
            </div>
          </div>

          {filteredItems.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 min-[1800px]:grid-cols-5">
              {filteredItems.map((item) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  onAdd={(selectedItem) => {
                    const needsConfiguration =
                      selectedItem.variants.length > 1 ||
                      selectedItem.modifierGroups.length > 0;
                    if (needsConfiguration) {
                      setConfiguringItem(selectedItem);
                    } else {
                      posCartActions.addItem(selectedItem);
                    }
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="grid min-h-72 place-items-center rounded-[26px] border border-dashed border-[#d9ccc2] bg-white/60 p-8 text-center">
              <div>
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f3ece5] text-[#C8102E]">
                  <FontAwesomeIcon icon={faUtensils} />
                </span>
                <h3 className="mt-4 text-base font-black text-[#122b3c]">
                  No matching items
                </h3>
                <p className="mt-1 text-sm text-[#8b7e75]">
                  Try a different search or category.
                </p>
              </div>
            </div>
          )}
        </main>

        <aside className="hidden min-h-0 border-l border-[#e4d8ce] bg-[#fffdf9] min-[1400px]:block">
          <div className="h-full min-h-0">{cartPanel}</div>
        </aside>
      </div>

      {configuringItem && (
        <ItemConfigurator
          item={configuringItem}
          onClose={() => setConfiguringItem(null)}
          onConfirm={(configuration) => {
            posCartActions.addItem(configuringItem, configuration);
            setConfiguringItem(null);
          }}
        />
      )}

      <PosBillingModal
        open={billingOpen}
        cart={cart}
        onClose={() => setBillingOpen(false)}
        onCompleted={(message) => {
          setStatusMessage(message);
          setBillingOpen(false);
          window.dispatchEvent(new Event("trs:pos-cash-drawer-changed"));
        }}
      />
      {heldOrdersOpen && (
        <div className="fixed inset-0 z-[130] grid place-items-center bg-black/55 p-4 backdrop-blur-sm">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => setHeldOrdersOpen(false)}
            aria-label="Close held orders"
          />
          <section className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[28px] bg-[#fffdf9] shadow-2xl">
            <header className="flex items-center justify-between border-b border-[#eadfd6] px-5 py-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#C8102E]">
                  Saved at counter
                </p>
                <h2 className="text-xl font-black text-[#122b3c]">
                  Held orders
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setHeldOrdersOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-xl bg-[#f3ece5]"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </header>
            <div className="max-h-[65vh] overflow-y-auto p-5">
              {heldLoading ? (
                <p className="py-12 text-center text-sm font-bold text-[#8b7e75]">
                  Loading held orders...
                </p>
              ) : heldOrders.length ? (
                <div className="space-y-3">
                  {heldOrders.map((order) => (
                    <article
                      key={order.id}
                      className="flex items-center gap-3 rounded-2xl border border-[#e5d9cf] bg-white p-4"
                    >
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#f3ece5] text-[#C8102E]">
                        <FontAwesomeIcon icon={faPause} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-black text-[#122b3c]">
                          {order.title}
                        </h3>
                        <p className="mt-1 text-[10px] font-bold text-[#8b7e75]">
                          {order.itemCount} items ·{" "}
                          {money.format(order.grandTotal)} ·{" "}
                          {new Date(order.updatedAt).toLocaleString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          cart.lines.length
                            ? setPendingAction({ kind: "recall", order })
                            : void recallHeldOrder(order)
                        }
                        className="rounded-xl bg-[#111820] px-3 py-2 text-xs font-black text-white"
                      >
                        Recall
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPendingAction({ kind: "delete-held", order })
                        }
                        className="grid h-9 w-9 place-items-center rounded-xl bg-red-50 text-[#C8102E]"
                        aria-label={`Delete ${order.title}`}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <FontAwesomeIcon
                    icon={faFolderOpen}
                    className="text-3xl text-[#c7b8ad]"
                  />
                  <p className="mt-3 text-sm font-black text-[#122b3c]">
                    No held orders
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      <CustomActionModal
        open={Boolean(pendingAction)}
        title={
          pendingAction?.kind === "clear"
            ? "Clear current POS order?"
            : pendingAction?.kind === "hold"
              ? "Hold current order"
              : pendingAction?.kind === "recall"
                ? "Replace current cart?"
                : "Delete held order?"
        }
        description={
          pendingAction?.kind === "clear"
            ? "This removes every item, customer selection, discount and charge from the current cart."
            : pendingAction?.kind === "hold"
              ? "Give this held order a clear name so the cashier can find it later."
              : pendingAction?.kind === "recall"
                ? "The current cart will be replaced by the selected held order."
                : "This permanently removes the held order."
        }
        confirmLabel={
          pendingAction?.kind === "hold"
            ? "Hold order"
            : pendingAction?.kind === "recall"
              ? "Replace cart"
              : pendingAction?.kind === "clear"
                ? "Clear order"
                : "Delete"
        }
        tone={
          pendingAction?.kind === "clear" ||
          pendingAction?.kind === "delete-held"
            ? "danger"
            : "default"
        }
        inputLabel={
          pendingAction?.kind === "hold" ? "Held order name" : undefined
        }
        inputRequired={pendingAction?.kind === "hold"}
        initialValue={
          pendingAction?.kind === "hold"
            ? `Order ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
            : ""
        }
        onClose={() => setPendingAction(null)}
        onConfirm={async (value) => {
          const action = pendingAction;
          setPendingAction(null);
          if (!action) return;
          if (action.kind === "clear") posCartActions.clear();
          if (action.kind === "hold") await holdCurrentOrder(value);
          if (action.kind === "recall") await recallHeldOrder(action.order);
          if (action.kind === "delete-held")
            await deleteHeldOrder(action.order.id);
        }}
      />

      <PayLaterOrderModal
        open={runningOrderOpen}
        orderType={cart.orderType}
        tables={runningTables}
        onClose={() => setRunningOrderOpen(false)}
        onConfirm={createPayLaterOrder}
      />

      {mobileCategoriesOpen && (
        <div className="fixed inset-0 z-[150] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileCategoriesOpen(false)}
            aria-label="Close category browser"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-category-title"
            className="absolute inset-x-0 bottom-0 flex max-h-[82dvh] flex-col overflow-hidden rounded-t-[28px] bg-[#fffdf9] shadow-2xl"
          >
            <header className="flex shrink-0 items-center justify-between border-b border-[#e8ddd3] px-5 py-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#C8102E]">
                  Menu navigation
                </p>
                <h2
                  id="mobile-category-title"
                  className="mt-1 text-xl font-black text-[#122b3c]"
                >
                  Browse categories
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setMobileCategoriesOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-xl border border-[#e5d9cf] bg-white text-[#122b3c] shadow-sm"
                aria-label="Close category browser"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory("all");
                    setMobileCategoriesOpen(false);
                  }}
                  className={`min-h-14 rounded-2xl border px-4 py-3 text-left text-sm font-black transition ${
                    activeCategory === "all"
                      ? "border-[#111820] bg-[#111820] text-white shadow-lg"
                      : "border-[#e5d9cf] bg-white text-[#122b3c]"
                  }`}
                >
                  All Items
                </button>

                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      setActiveCategory(category.id);
                      setMobileCategoriesOpen(false);
                    }}
                    className={`min-h-14 rounded-2xl border px-4 py-3 text-left text-sm font-black transition ${
                      activeCategory === category.id
                        ? "border-[#C8102E] bg-red-50 text-[#C8102E] shadow-sm"
                        : "border-[#e5d9cf] bg-white text-[#122b3c]"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {mobileCartOpen && (
        <div className="fixed inset-0 z-[110] min-[1400px]:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileCartOpen(false)}
            aria-label="Close current order"
          />
          <section className="absolute inset-y-0 right-0 w-full max-w-md bg-[#fffdf9] shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileCartOpen(false)}
              className="absolute right-4 top-4 z-30 grid h-10 w-10 place-items-center rounded-xl border border-[#e5d9cf] bg-white text-[#122b3c] shadow-lg"
              aria-label="Close current order"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
            {cartPanel}
          </section>
        </div>
      )}
    </div>
  );
}

function CartPanel({
  cart,
  itemCount,
  totals,
  adjustments,
  defaultTaxRate,
  defaultTaxMode,
  orderType,
  orderNote,
  customer,
  internalConsumption,
  cashierName,
  onOrderTypeChange,
  onChangeQuantity,
  onSetQuantity,
  onRemove,
  onLineNoteChange,
  onOrderNoteChange,
  onCustomerChange,
  onInternalConsumptionChange,
  onAdjustmentsChange,
  onHold,
  onOpenHeld,
  heldCount,
  statusMessage,
  onBilling,
  onRunningOrder,
  runningOrderLabel,
  onClear,
}: {
  cart: PosCartLine[];
  itemCount: number;
  totals: PosCartTotals;
  adjustments: import("@/types/pos").PosCartAdjustments;
  defaultTaxRate: number;
  defaultTaxMode: PosTaxMode;
  orderType: PosOrderType;
  orderNote: string;
  customer: PosCustomer;
  internalConsumption: PosInternalConsumption;
  cashierName: string;
  onOrderTypeChange: (value: PosOrderType) => void;
  onChangeQuantity: (lineId: string, change: number) => void;
  onSetQuantity: (lineId: string, quantity: number) => void;
  onRemove: (lineId: string) => void;
  onLineNoteChange: (lineId: string, note: string) => void;
  onOrderNoteChange: (note: string) => void;
  onCustomerChange: (customer: PosCustomer) => void;
  onInternalConsumptionChange: (value: PosInternalConsumption) => void;
  onAdjustmentsChange: (
    patch: Partial<import("@/types/pos").PosCartAdjustments>,
  ) => void;
  onHold: () => void;
  onOpenHeld: () => void;
  heldCount: number;
  statusMessage: string;
  onBilling: () => void;
  onRunningOrder: () => void;
  runningOrderLabel: string;
  onClear: () => void;
}) {
  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
      <div className="sticky top-0 z-10 border-b border-[#e8ddd3] bg-[#fffdf9] px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex items-center justify-between gap-3 pr-10 xl:pr-0">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#C8102E]">
              Current order
            </p>
            <h2 className="mt-1 text-xl font-black tracking-[-.04em] text-[#122b3c]">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </h2>
          </div>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#C8102E] hover:bg-red-50"
            >
              <FontAwesomeIcon icon={faTrash} /> Clear
            </button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 rounded-2xl bg-[#f3ece5] p-1">
          <button
            type="button"
            onClick={() => onOrderTypeChange("dine_in")}
            className={`rounded-xl px-3 py-2.5 text-xs font-black transition ${
              orderType === "dine_in"
                ? "bg-white text-[#122b3c] shadow-sm"
                : "text-[#8b7e75]"
            }`}
          >
            <FontAwesomeIcon icon={faUtensils} className="mr-2" /> Dine-in
          </button>
          <button
            type="button"
            onClick={() => onOrderTypeChange("takeaway")}
            className={`rounded-xl px-3 py-2.5 text-xs font-black transition ${
              orderType === "takeaway"
                ? "bg-white text-[#122b3c] shadow-sm"
                : "text-[#8b7e75]"
            }`}
          >
            <FontAwesomeIcon icon={faBagShopping} className="mr-2" /> Takeaway
          </button>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-5">
        {cart.length ? (
          <div className="space-y-3">
            {cart.map((line) => (
              <article
                key={line.lineId}
                className="rounded-2xl border border-[#e8ddd3] bg-white p-3"
              >
                <div className="flex gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#efe7df]">
                    {line.imageUrl ? (
                      <Image
                        src={line.imageUrl}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="grid h-full place-items-center text-[#C8102E]/45">
                        <FontAwesomeIcon icon={faUtensils} />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-black text-[#122b3c]">
                          {line.name}
                        </h3>
                        {line.variantName && (
                          <p className="mt-1 text-[10px] font-black text-[#756960]">
                            {line.variantName}
                          </p>
                        )}
                        {line.modifiers.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {line.modifiers.map((modifier) => (
                              <p
                                key={`${modifier.groupId}-${modifier.optionId}`}
                                className="text-[9px] font-semibold leading-4 text-[#8b7e75]"
                              >
                                + {modifier.optionName}
                                {modifier.quantity > 1
                                  ? ` × ${modifier.quantity}`
                                  : ""}
                              </p>
                            ))}
                          </div>
                        )}
                        <p className="mt-1 text-xs font-bold text-[#C8102E]">
                          {money.format(line.unitPrice)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemove(line.lineId)}
                        className="grid h-7 w-7 place-items-center rounded-lg text-[#a69990] hover:bg-red-50 hover:text-[#C8102E]"
                        aria-label={`Remove ${line.name}`}
                      >
                        <FontAwesomeIcon icon={faXmark} />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="flex items-center rounded-xl bg-[#f3ece5] p-1">
                        <button
                          type="button"
                          onClick={() => onChangeQuantity(line.lineId, -1)}
                          className="grid h-7 w-7 place-items-center rounded-lg bg-white text-[#122b3c] shadow-sm"
                          aria-label={`Decrease ${line.name}`}
                        >
                          <FontAwesomeIcon icon={faMinus} className="h-2.5" />
                        </button>
                        <label className="relative min-w-10">
                          <span className="sr-only">
                            Quantity for {line.name}
                          </span>
                          <input
                            type="number"
                            min={1}
                            max={99}
                            inputMode="numeric"
                            value={line.quantity}
                            onChange={(event) =>
                              onSetQuantity(
                                line.lineId,
                                Number(event.currentTarget.value),
                              )
                            }
                            className="h-7 w-10 bg-transparent text-center text-xs font-black text-[#122b3c] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => onChangeQuantity(line.lineId, 1)}
                          className="grid h-7 w-7 place-items-center rounded-lg bg-[#111820] text-white shadow-sm"
                          aria-label={`Increase ${line.name}`}
                        >
                          <FontAwesomeIcon icon={faPlus} className="h-2.5" />
                        </button>
                      </div>
                      <span className="text-sm font-black text-[#122b3c]">
                        {money.format(line.unitPrice * line.quantity)}
                      </span>
                    </div>
                    <label className="mt-3 block">
                      <span className="sr-only">Note for {line.name}</span>
                      <input
                        value={line.note}
                        onChange={(event) =>
                          onLineNoteChange(
                            line.lineId,
                            event.currentTarget.value,
                          )
                        }
                        maxLength={240}
                        placeholder="Item note (optional)"
                        className="h-9 w-full rounded-xl border border-[#eadfd6] bg-[#fffdf9] px-3 text-xs font-semibold text-[#122b3c] outline-none transition placeholder:text-[#aa9e95] focus:border-[#C8102E] focus:ring-3 focus:ring-[#C8102E]/10"
                      />
                    </label>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="grid h-full min-h-64 place-items-center text-center">
            <div>
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-[#f3ece5] text-xl text-[#C8102E]">
                <FontAwesomeIcon icon={faReceipt} />
              </span>
              <h3 className="mt-4 text-base font-black text-[#122b3c]">
                Start a new order
              </h3>
              <p className="mx-auto mt-1 max-w-52 text-xs font-medium leading-5 text-[#8b7e75]">
                Select products from the catalogue to add them here.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-[#e8ddd3] bg-white px-4 py-4 sm:px-5 sm:py-5">
        <InternalConsumptionPanel
          value={internalConsumption}
          onChange={onInternalConsumptionChange}
        />
        {internalConsumption.saleType === "customer" ? (
          <PosCustomerPanel customer={customer} onChange={onCustomerChange} />
        ) : null}
        {cart.length > 0 && (
          <label className="mb-4 block">
            <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[.12em] text-[#8b7e75]">
              Order note
            </span>
            <textarea
              value={orderNote}
              onChange={(event) => onOrderNoteChange(event.currentTarget.value)}
              maxLength={500}
              rows={2}
              placeholder="Instructions for the complete order..."
              className="w-full resize-none rounded-xl border border-[#e5d9cf] bg-[#fffdf9] px-3 py-2 text-xs font-semibold text-[#122b3c] outline-none transition placeholder:text-[#aa9e95] focus:border-[#C8102E] focus:ring-3 focus:ring-[#C8102E]/10"
            />
          </label>
        )}
        {cart.length > 0 && internalConsumption.saleType === "customer" && (
          <div className="mb-4 rounded-2xl border border-[#e5d9cf] bg-[#fffdf9] p-3">
            <p className="mb-3 text-[9px] font-black uppercase tracking-[.18em] text-[#C8102E]">
              Pricing adjustments
            </p>
            <div className="grid grid-cols-2 gap-2">
              <SelectField
                label="Discount"
                value={adjustments.discountType}
                onChange={(value) =>
                  onAdjustmentsChange({
                    discountType: value as PosDiscountType,
                    discountValue:
                      value === "none" ? 0 : adjustments.discountValue,
                  })
                }
                options={[
                  { value: "none", label: "No discount" },
                  { value: "fixed", label: "Fixed amount" },
                  { value: "percentage", label: "Percentage" },
                ]}
              />
              <NumberField
                label={
                  adjustments.discountType === "percentage"
                    ? "Discount %"
                    : "Discount amount"
                }
                value={adjustments.discountValue}
                disabled={adjustments.discountType === "none"}
                max={
                  adjustments.discountType === "percentage"
                    ? 100
                    : totals.subtotal
                }
                onChange={(discountValue) =>
                  onAdjustmentsChange({ discountValue })
                }
              />
            </div>
            {adjustments.discountType !== "none" && (
              <label className="mt-2 block text-[10px] font-black text-[#756960]">
                Discount reason
                <input
                  value={adjustments.discountReason}
                  onChange={(event) =>
                    onAdjustmentsChange({
                      discountReason: event.currentTarget.value,
                    })
                  }
                  maxLength={120}
                  placeholder="Required for audit trail"
                  className="mt-1 h-9 w-full rounded-xl border border-[#e5d9cf] bg-white px-3 text-xs font-semibold text-[#122b3c] outline-none focus:border-[#C8102E]"
                />
              </label>
            )}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <NumberField
                label="Packing charge"
                value={adjustments.packingCharge}
                onChange={(packingCharge) =>
                  onAdjustmentsChange({ packingCharge })
                }
              />
              <NumberField
                label="Service charge"
                value={adjustments.serviceCharge}
                onChange={(serviceCharge) =>
                  onAdjustmentsChange({ serviceCharge })
                }
              />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="text-[10px] font-black text-[#756960]">
                Charge label
                <input
                  value={adjustments.additionalChargeLabel}
                  onChange={(event) =>
                    onAdjustmentsChange({
                      additionalChargeLabel: event.currentTarget.value,
                    })
                  }
                  maxLength={60}
                  className="mt-1 h-9 w-full rounded-xl border border-[#e5d9cf] bg-white px-3 text-xs font-semibold text-[#122b3c] outline-none focus:border-[#C8102E]"
                />
              </label>
              <NumberField
                label="Additional charge"
                value={adjustments.additionalCharge}
                onChange={(additionalCharge) =>
                  onAdjustmentsChange({ additionalCharge })
                }
              />
            </div>
            <div className="mt-2 rounded-xl border border-[#e5d9cf] bg-white p-3">
              <label className="flex items-center justify-between gap-3">
                <span>
                  <strong className="block text-[10px] font-black text-[#756960]">
                    Add GST to this bill
                  </strong>
                  <small className="mt-0.5 block text-[9px] font-semibold text-[#9a8e85]">
                    Current configured GST rate: {defaultTaxRate}% ·{" "}
                    {defaultTaxMode === "inclusive"
                      ? "included in price"
                      : "added on total"}
                  </small>
                </span>
                <input
                  type="checkbox"
                  aria-label="Add GST to this bill"
                  checked={adjustments.taxRate > 0}
                  onChange={(event) =>
                    onAdjustmentsChange(
                      event.currentTarget.checked
                        ? { taxRate: defaultTaxRate, taxMode: defaultTaxMode }
                        : { taxRate: 0 },
                    )
                  }
                  className="h-5 w-5 shrink-0 accent-[#C8102E]"
                />
              </label>
              <p className="mt-2 text-[9px] font-semibold leading-4 text-[#8b7e75]">
                Change the restaurant GST rate from Admin → System Settings →
                Taxes & Charges. New POS orders automatically use that rate.
              </p>
            </div>
          </div>
        )}
        <div className="space-y-2 text-sm">
          <SummaryRow label="Subtotal" value={totals.subtotal} />
          {totals.discountAmount > 0 && (
            <SummaryRow
              label="Discount"
              value={-totals.discountAmount}
              accent
            />
          )}
          {totals.packingCharge > 0 && (
            <SummaryRow label="Packing charge" value={totals.packingCharge} />
          )}
          {totals.serviceCharge > 0 && (
            <SummaryRow label="Service charge" value={totals.serviceCharge} />
          )}
          {totals.additionalCharge > 0 && (
            <SummaryRow
              label={adjustments.additionalChargeLabel}
              value={totals.additionalCharge}
            />
          )}
          {totals.taxAmount > 0 && (
            <SummaryRow
              label={`Tax (${adjustments.taxRate}%, ${adjustments.taxMode})`}
              value={totals.taxAmount}
            />
          )}
          <div className="mt-3 flex items-end justify-between border-t border-dashed border-[#dfd2c8] pt-3">
            <div>
              <span className="font-black text-[#122b3c]">
                {internalConsumption.saleType === "customer"
                  ? "Grand total"
                  : "Amount charged"}
              </span>
              {internalConsumption.saleType === "customer" &&
                totals.savings > 0 && (
                  <p className="mt-0.5 text-[10px] font-black text-emerald-700">
                    Customer saves {money.format(totals.savings)}
                  </p>
                )}
            </div>
            <span className="text-2xl font-black tracking-[-.05em] text-[#C8102E]">
              {money.format(
                internalConsumption.saleType === "customer"
                  ? totals.grandTotal
                  : 0,
              )}
            </span>
          </div>
        </div>
        {statusMessage && (
          <p className="mt-3 rounded-xl bg-[#f3ece5] px-3 py-2 text-center text-[10px] font-black text-[#6d625a]">
            {statusMessage}
          </p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={!cart.length}
            onClick={onHold}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#d9ccc2] bg-white text-xs font-black text-[#122b3c] disabled:opacity-40"
          >
            <FontAwesomeIcon icon={faPause} /> Hold order
          </button>
          <button
            type="button"
            onClick={onOpenHeld}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#111820] text-xs font-black text-white"
          >
            <FontAwesomeIcon icon={faFolderOpen} /> Held{" "}
            {heldCount > 0 ? `(${heldCount})` : ""}
          </button>
        </div>
        <button
          type="button"
          disabled={!cart.length}
          onClick={onRunningOrder}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#122b3c] bg-white px-4 text-xs font-black text-[#122b3c] disabled:opacity-40"
        >
          <FontAwesomeIcon icon={faTableColumns} /> {runningOrderLabel}
        </button>
        <button
          type="button"
          disabled={!cart.length}
          onClick={onBilling}
          className="mt-3 flex h-13 w-full items-center justify-center gap-3 rounded-2xl bg-[#C8102E] px-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(200,16,46,.28)] transition hover:bg-[#a90d27] disabled:cursor-not-allowed disabled:bg-[#d6cbc3] disabled:shadow-none"
        >
          {internalConsumption.saleType === "customer"
            ? "Continue to billing"
            : "Create internal order"}
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
        <div className="mt-3 flex items-center justify-center gap-2 text-[10px] font-bold text-[#9a8e85]">
          <FontAwesomeIcon icon={faArrowRotateLeft} />
          Phase 4 ready · running orders, tables, billing, refunds & shift
          reports · {cashierName}
        </div>
      </div>
    </div>
  );
}

function GuestDetailsForm({
  form,
  setForm,
  message,
  setMessage,
  onBack,
  onUse,
}: {
  form: { name: string; phone: string; email: string };
  setForm: Dispatch<
    SetStateAction<{ name: string; phone: string; email: string }>
  >;
  message: string;
  setMessage: (value: string) => void;
  onBack: () => void;
  onUse: (customer: PosCustomer) => void;
}) {
  return (
    <div className="mt-5 space-y-3">
      <p className="rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-900">
        These details print on this bill only. Create or link the customer later
        from Bill History.
      </p>
      {(
        [
          ["name", "Name"],
          ["phone", "Phone (optional)"],
          ["email", "Email (optional)"],
        ] as const
      ).map(([key, label]) => (
        <label
          key={key}
          className="block text-[10px] font-black text-[#756960]"
        >
          {label}
          <input
            value={form[key]}
            onChange={(event) => {
              const raw = event.currentTarget.value;
              const value =
                key === "phone" ? raw.replace(/\D/g, "").slice(0, 10) : raw;
              setForm((current) => ({ ...current, [key]: value }));
              if (message) setMessage("");
            }}
            className="mt-1 h-11 w-full rounded-xl border border-[#e5d9cf] px-3 text-sm font-semibold"
          />
        </label>
      ))}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onBack}
          className="h-11 rounded-xl border text-xs font-black"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => {
            const phone = form.phone.replace(/\D/g, "");
            if (phone && !/^[6-9]\d{9}$/.test(phone)) {
              setMessage("Enter a valid 10-digit phone or leave it blank.");
              return;
            }
            onUse({
              id: "",
              name: form.name.trim() || "Guest customer",
              phone,
              email: form.email.trim().toLowerCase(),
              isWalkIn: true,
            });
          }}
          className="h-11 rounded-xl bg-amber-500 text-xs font-black"
        >
          Use guest details
        </button>
      </div>
    </div>
  );
}
