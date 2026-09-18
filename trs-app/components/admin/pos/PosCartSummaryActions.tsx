"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRotateLeft, faChevronRight, faFolderOpen, faPause, faTableColumns } from "@fortawesome/free-solid-svg-icons";
import { SummaryRow } from "@/components/admin/pos/PosWorkspaceUi";
import type { PosCartAdjustments, PosCartTotals, PosInternalConsumption } from "@/types/pos";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function PosCartSummaryActions({
  hasItems, totals, adjustments, internalConsumption, heldCount, statusMessage,
  runningOrderLabel, cashierName, onHold, onOpenHeld, onRunningOrder, onBilling,
}: {
  hasItems: boolean;
  totals: PosCartTotals;
  adjustments: PosCartAdjustments;
  internalConsumption: PosInternalConsumption;
  heldCount: number;
  statusMessage: string;
  runningOrderLabel: string;
  cashierName: string;
  onHold: () => void;
  onOpenHeld: () => void;
  onRunningOrder: () => void;
  onBilling: () => void;
}) {
  const isCustomer = internalConsumption.saleType === "customer";
  return <>
    <div className="space-y-2 text-sm">
      <SummaryRow label="Subtotal" value={totals.subtotal} />
      {totals.discountAmount > 0 && <SummaryRow label="Discount" value={-totals.discountAmount} accent />}
      {totals.packingCharge > 0 && <SummaryRow label="Packing charge" value={totals.packingCharge} />}
      {totals.serviceCharge > 0 && <SummaryRow label="Service charge" value={totals.serviceCharge} />}
      {totals.additionalCharge > 0 && <SummaryRow label={adjustments.additionalChargeLabel} value={totals.additionalCharge} />}
      {totals.taxAmount > 0 && <SummaryRow label={`Tax (${adjustments.taxRate}%, ${adjustments.taxMode})`} value={totals.taxAmount} />}
      <div className="mt-3 flex items-end justify-between border-t border-dashed border-[#dfd2c8] pt-3">
        <div>
          <span className="font-black text-[#122b3c]">{isCustomer ? "Grand total" : "Amount charged"}</span>
          {isCustomer && totals.savings > 0 && <p className="mt-0.5 text-[10px] font-black text-emerald-700">Customer saves {money.format(totals.savings)}</p>}
        </div>
        <span className="text-2xl font-black tracking-[-.05em] text-[#C8102E]">{money.format(isCustomer ? totals.grandTotal : 0)}</span>
      </div>
    </div>
    {statusMessage && <p className="mt-3 rounded-xl bg-[#f3ece5] px-3 py-2 text-center text-[10px] font-black text-[#6d625a]">{statusMessage}</p>}
    <div className="mt-4 grid grid-cols-2 gap-2">
      <button type="button" disabled={!hasItems} onClick={onHold} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#d9ccc2] bg-white text-xs font-black text-[#122b3c] disabled:opacity-40"><FontAwesomeIcon icon={faPause} /> Hold order</button>
      <button type="button" onClick={onOpenHeld} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#111820] text-xs font-black text-white"><FontAwesomeIcon icon={faFolderOpen} /> Held {heldCount > 0 ? `(${heldCount})` : ""}</button>
    </div>
    <button type="button" disabled={!hasItems} onClick={onRunningOrder} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#122b3c] bg-white px-4 text-xs font-black text-[#122b3c] disabled:opacity-40"><FontAwesomeIcon icon={faTableColumns} /> {runningOrderLabel}</button>
    <button type="button" disabled={!hasItems} onClick={onBilling} className="mt-3 flex h-13 w-full items-center justify-center gap-3 rounded-2xl bg-[#C8102E] px-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(200,16,46,.28)] transition hover:bg-[#a90d27] disabled:cursor-not-allowed disabled:bg-[#d6cbc3] disabled:shadow-none">{isCustomer ? "Continue to billing" : "Create internal order"}<FontAwesomeIcon icon={faChevronRight} /></button>
    <div className="mt-3 flex items-center justify-center gap-2 text-[10px] font-bold text-[#9a8e85]"><FontAwesomeIcon icon={faArrowRotateLeft} />Phase 4 ready · running orders, tables, billing, refunds & shift reports · {cashierName}</div>
  </>;
}
