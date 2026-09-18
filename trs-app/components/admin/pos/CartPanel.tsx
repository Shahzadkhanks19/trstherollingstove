"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRotateLeft, faBagShopping, faChevronRight, faFolderOpen, faPause, faTableColumns, faTrash, faUtensils } from "@fortawesome/free-solid-svg-icons";
import { InternalConsumptionPanel } from "@/components/admin/pos/InternalConsumptionPanel";
import { PosCartItems } from "@/components/admin/pos/PosCartItems";
import { PosCustomerPanel } from "@/components/admin/pos/PosCustomerPanel";
import { NumberField, SelectField, SummaryRow } from "@/components/admin/pos/PosWorkspaceUi";
import type { PosCartAdjustments, PosCartLine, PosCartTotals, PosCustomer, PosDiscountType, PosInternalConsumption, PosOrderType, PosTaxMode } from "@/types/pos";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

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

