"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { calculatePosCartTotals } from "@/lib/pos/cart";
import { posCartActions, usePosCart } from "@/lib/pos/cart-store";
import { PosBillingModal } from "@/components/admin/pos/PosBillingModal";
import { PosCatalogPanel } from "@/components/admin/pos/PosCatalogPanel";
import { PosWorkspaceHeader } from "@/components/admin/pos/PosWorkspaceHeader";
import { PosMobileCartDrawer, PosMobileCategoryDrawer } from "@/components/admin/pos/PosMobileDrawers";
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
      <PosWorkspaceHeader
        cashierName={cashierName}
        itemCount={totals.itemCount}
        queuedSales={queuedSales}
        editingTicketNumber={runningOrder.editing?.ticketNumber}
        onOpenCart={() => {
          if (totals.itemCount > 0) setMobileCartOpen(true);
        }}
        onCancelEditing={runningOrder.cancelEdit}
      />

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

      <PosMobileCategoryDrawer
        open={mobileCategoriesOpen}
        categories={categories}
        activeCategory={activeCategory}
        onSelect={setActiveCategory}
        onClose={() => setMobileCategoriesOpen(false)}
      />

      <PosMobileCartDrawer
        open={mobileCartOpen}
        onClose={() => setMobileCartOpen(false)}
      >
        {cartPanel}
      </PosMobileCartDrawer>
    </div>
  );
}
