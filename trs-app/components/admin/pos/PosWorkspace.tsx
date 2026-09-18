"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCashRegister,
  faClock,
  faReceipt,
} from "@fortawesome/free-solid-svg-icons";
import { calculatePosCartTotals } from "@/lib/pos/cart";
import { posCartActions, usePosCart } from "@/lib/pos/cart-store";
import { PosBillingModal } from "@/components/admin/pos/PosBillingModal";
import { PosCatalogPanel } from "@/components/admin/pos/PosCatalogPanel";
import { PosCashDrawerControl } from "@/components/admin/pos/PosCashDrawerControl";
import { PayLaterOrderModal } from "@/components/admin/pos/PayLaterOrderModal";
import { ItemConfigurator } from "@/components/admin/pos/ItemConfigurator";
import { CartPanel } from "@/components/admin/pos/CartPanel";
import { HeldOrdersModal, type HeldOrder } from "@/components/admin/pos/HeldOrdersModal";
import { useHeldOrders } from "@/components/admin/pos/useHeldOrders";
import { useRunningOrder } from "@/components/admin/pos/useRunningOrder";
import { usePosWorkspaceRecovery } from "@/components/admin/pos/usePosWorkspaceRecovery";
import { CustomActionModal } from "@/components/admin/CustomActionModal";
import type {
  PosTaxMode,
  PosCatalogItem,
  PosCategory,
} from "@/types/pos";

type PendingPosAction =
  | { kind: "clear" }
  | { kind: "hold" }
  | { kind: "recall"; order: HeldOrder }
  | { kind: "delete-held"; order: HeldOrder }
  | null;

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
  const [activeCategory, setActiveCategory] = useState("all");
  const [query, setQuery] = useState("");
  const cart = usePosCart();
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false);
  const [configuringItem, setConfiguringItem] = useState<PosCatalogItem | null>(
    null,
  );
  const [statusMessage, setStatusMessage] = useState("");
  const heldOrders = useHeldOrders({ cart, setStatusMessage });
  const runningOrder = useRunningOrder({ cart, setStatusMessage });
  const { queuedSales } = usePosWorkspaceRecovery({
    cart,
    setEditingRunningOrder: runningOrder.setEditing,
    setStatusMessage,
  });
  const [billingOpen, setBillingOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingPosAction>(null);

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
    if (!mobileCartOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileCartOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileCartOpen]);

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
      onOpenHeld={heldOrders.show}
      heldCount={heldOrders.orders.length}
      statusMessage={statusMessage}
      onBilling={() => {
        setMobileCartOpen(false);
        setBillingOpen(true);
      }}
      onRunningOrder={runningOrder.begin}
      runningOrderLabel={
        runningOrder.editing
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

        {runningOrder.editing && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[.16em] text-blue-700">
                Modifying running order
              </p>
              <p className="text-sm font-black text-blue-950">
                {runningOrder.editing.ticketNumber} · Add, remove or change
                items, then save and regenerate the KOT.
              </p>
            </div>
            <button
              type="button"
              onClick={runningOrder.cancelEdit}
              className="rounded-xl border border-blue-300 bg-white px-3 py-2 text-xs font-black text-blue-800"
            >
              Cancel modification
            </button>
          </div>
        )}
      </header>

      <div className="grid min-h-0 flex-1 min-[1400px]:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
        <PosCatalogPanel
          categories={categories}
          items={filteredItems}
          activeCategory={activeCategory}
          query={query}
          mobileCategoriesOpen={mobileCategoriesOpen}
          onCategoryChange={setActiveCategory}
          onQueryChange={setQuery}
          onOpenCategories={() => setMobileCategoriesOpen(true)}
          onAddItem={(selectedItem) => {
            const needsConfiguration =
              selectedItem.variants.length > 1 ||
              selectedItem.modifierGroups.length > 0;
            if (needsConfiguration) setConfiguringItem(selectedItem);
            else posCartActions.addItem(selectedItem);
          }}
        />

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
      <HeldOrdersModal
        open={heldOrders.open}
        loading={heldOrders.loading}
        orders={heldOrders.orders}
        hasCurrentCart={cart.lines.length > 0}
        onClose={() => heldOrders.setOpen(false)}
        onRecall={(order) =>
          cart.lines.length
            ? setPendingAction({ kind: "recall", order })
            : void heldOrders.recall(order)
        }
        onDelete={(order) => setPendingAction({ kind: "delete-held", order })}
      />

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
          if (action.kind === "hold") await heldOrders.hold(value);
          if (action.kind === "recall") await heldOrders.recall(action.order);
          if (action.kind === "delete-held")
            await heldOrders.remove(action.order.id);
        }}
      />

      <PayLaterOrderModal
        open={runningOrder.open}
        orderType={cart.orderType}
        tables={runningOrder.tables}
        onClose={() => runningOrder.setOpen(false)}
        onConfirm={runningOrder.create}
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
