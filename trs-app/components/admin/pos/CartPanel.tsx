"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBagShopping, faTrash, faUtensils } from "@fortawesome/free-solid-svg-icons";
import { InternalConsumptionPanel } from "@/components/admin/pos/InternalConsumptionPanel";
import { PosCartItems } from "@/components/admin/pos/PosCartItems";
import { PosCustomerPanel } from "@/components/admin/pos/PosCustomerPanel";
import { PosPricingAdjustments } from "@/components/admin/pos/PosPricingAdjustments";
import { PosCartSummaryActions } from "@/components/admin/pos/PosCartSummaryActions";
import type { PosCartAdjustments, PosCartLine, PosCartTotals, PosCustomer, PosInternalConsumption, PosOrderType, PosTaxMode } from "@/types/pos";

export function CartPanel({
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
        <PosCartItems
          cart={cart}
          onChangeQuantity={onChangeQuantity}
          onSetQuantity={onSetQuantity}
          onRemove={onRemove}
          onLineNoteChange={onLineNoteChange}
        />
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
          <PosPricingAdjustments
            adjustments={adjustments}
            totals={totals}
            defaultTaxRate={defaultTaxRate}
            defaultTaxMode={defaultTaxMode}
            onChange={onAdjustmentsChange}
          />
        )}
        <PosCartSummaryActions
          hasItems={cart.length > 0}
          totals={totals}
          adjustments={adjustments}
          internalConsumption={internalConsumption}
          heldCount={heldCount}
          statusMessage={statusMessage}
          runningOrderLabel={runningOrderLabel}
          cashierName={cashierName}
          onHold={onHold}
          onOpenHeld={onOpenHeld}
          onRunningOrder={onRunningOrder}
          onBilling={onBilling}
        />
      </div>
    </div>
  );
}

