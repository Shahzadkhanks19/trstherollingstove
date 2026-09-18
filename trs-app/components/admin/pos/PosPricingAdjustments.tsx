"use client";

import { NumberField, SelectField } from "@/components/admin/pos/PosWorkspaceUi";
import type { PosCartAdjustments, PosCartTotals, PosDiscountType, PosTaxMode } from "@/types/pos";

export function PosPricingAdjustments({
  adjustments, totals, defaultTaxRate, defaultTaxMode, onChange,
}: {
  adjustments: PosCartAdjustments;
  totals: PosCartTotals;
  defaultTaxRate: number;
  defaultTaxMode: PosTaxMode;
  onChange: (patch: Partial<PosCartAdjustments>) => void;
}) {
  return (
    <div className="mb-4 rounded-2xl border border-[#e5d9cf] bg-[#fffdf9] p-3">
      <p className="mb-3 text-[9px] font-black uppercase tracking-[.18em] text-[#C8102E]">Pricing adjustments</p>
      <div className="grid grid-cols-2 gap-2">
        <SelectField label="Discount" value={adjustments.discountType} onChange={(value) => onChange({ discountType: value as PosDiscountType, discountValue: value === "none" ? 0 : adjustments.discountValue })} options={[{ value: "none", label: "No discount" }, { value: "fixed", label: "Fixed amount" }, { value: "percentage", label: "Percentage" }]} />
        <NumberField label={adjustments.discountType === "percentage" ? "Discount %" : "Discount amount"} value={adjustments.discountValue} disabled={adjustments.discountType === "none"} max={adjustments.discountType === "percentage" ? 100 : totals.subtotal} onChange={(discountValue) => onChange({ discountValue })} />
      </div>
      {adjustments.discountType !== "none" && (
        <label className="mt-2 block text-[10px] font-black text-[#756960]">
          Discount reason
          <input value={adjustments.discountReason} onChange={(event) => onChange({ discountReason: event.currentTarget.value })} maxLength={120} placeholder="Required for audit trail" className="mt-1 h-9 w-full rounded-xl border border-[#e5d9cf] bg-white px-3 text-xs font-semibold text-[#122b3c] outline-none focus:border-[#C8102E]" />
        </label>
      )}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <NumberField label="Packing charge" value={adjustments.packingCharge} onChange={(packingCharge) => onChange({ packingCharge })} />
        <NumberField label="Service charge" value={adjustments.serviceCharge} onChange={(serviceCharge) => onChange({ serviceCharge })} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="text-[10px] font-black text-[#756960]">
          Charge label
          <input value={adjustments.additionalChargeLabel} onChange={(event) => onChange({ additionalChargeLabel: event.currentTarget.value })} maxLength={60} className="mt-1 h-9 w-full rounded-xl border border-[#e5d9cf] bg-white px-3 text-xs font-semibold text-[#122b3c] outline-none focus:border-[#C8102E]" />
        </label>
        <NumberField label="Additional charge" value={adjustments.additionalCharge} onChange={(additionalCharge) => onChange({ additionalCharge })} />
      </div>
      <div className="mt-2 rounded-xl border border-[#e5d9cf] bg-white p-3">
        <label className="flex items-center justify-between gap-3">
          <span>
            <strong className="block text-[10px] font-black text-[#756960]">Add GST to this bill</strong>
            <small className="mt-0.5 block text-[9px] font-semibold text-[#9a8e85]">Current configured GST rate: {defaultTaxRate}% · {defaultTaxMode === "inclusive" ? "included in price" : "added on total"}</small>
          </span>
          <input type="checkbox" aria-label="Add GST to this bill" checked={adjustments.taxRate > 0} onChange={(event) => onChange(event.currentTarget.checked ? { taxRate: defaultTaxRate, taxMode: defaultTaxMode } : { taxRate: 0 })} className="h-5 w-5 shrink-0 accent-[#C8102E]" />
        </label>
        <p className="mt-2 text-[9px] font-semibold leading-4 text-[#8b7e75]">Change the restaurant GST rate from Admin → System Settings → Taxes & Charges. New POS orders automatically use that rate.</p>
      </div>
    </div>
  );
}
