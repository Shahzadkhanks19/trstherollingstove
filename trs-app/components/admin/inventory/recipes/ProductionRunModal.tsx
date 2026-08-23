"use client";

import { motion } from "framer-motion";
import { NumberField } from "./form-controls";
import type { ProductionDialogState, ProductionRunForm } from "./types";

export function ProductionRunModal({ recipe, form, saving, onChange, onClose, onSubmit }: { recipe: ProductionDialogState; form: ProductionRunForm; saving: boolean; onChange: (form: ProductionRunForm) => void; onClose: () => void; onSubmit: () => void }) {
  const factor = recipe.baseYield > 0 ? form.targetYield / recipe.baseYield : 0;
  return (
    <motion.div className="fixed inset-0 z-[130] grid place-items-end bg-black/55 backdrop-blur-sm sm:place-items-center sm:p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.section role="dialog" aria-modal="true" aria-labelledby="production-modal-title" onMouseDown={(event) => event.stopPropagation()} className="w-full rounded-t-[28px] bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-[28px] sm:p-6" initial={{ y: 45, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 45, opacity: 0 }}>
        <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#C8102E]">Production batch</p>
        <h2 id="production-modal-title" className="mt-1 text-xl font-black text-[#173044]">Complete production: {recipe.name}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">Enter any target quantity. Ingredient requirements scale automatically from the base recipe. Current scale factor: <b>{factor.toFixed(3)}×</b>.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <NumberField label={`Target yield (${recipe.unit})`} value={form.targetYield} onChange={(targetYield) => onChange({ ...form, targetYield, actualYield: targetYield })} min={0.001} />
          <NumberField label={`Actual yield (${recipe.unit})`} value={form.actualYield} onChange={(actualYield) => onChange({ ...form, actualYield })} min={0.001} />
          <NumberField label={`Actual wastage (${recipe.unit})`} value={form.actualWastageQuantity} onChange={(actualWastageQuantity) => onChange({ ...form, actualWastageQuantity })} />
        </div>
        <label className="mt-4 block text-xs font-black text-[#173044]">Batch notes<textarea value={form.notes} onChange={(event) => onChange({ ...form, notes: event.currentTarget.value })} className="mt-2 min-h-24 w-full rounded-xl border border-[#ded3ca] p-3 font-normal outline-none focus:border-[#C8102E]" placeholder="Actual yield reason, quality notes, batch observations" /></label>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" disabled={saving} onClick={onClose} className="h-12 rounded-xl border border-[#ded3ca] text-xs font-black text-[#173044] disabled:opacity-50">Cancel</button>
          <button type="button" disabled={saving || form.targetYield <= 0 || form.actualYield <= 0} onClick={onSubmit} className="h-12 rounded-xl bg-[#C8102E] text-xs font-black text-white disabled:opacity-50">{saving ? "Processing…" : "Complete & update stock"}</button>
        </div>
      </motion.section>
    </motion.div>
  );
}
