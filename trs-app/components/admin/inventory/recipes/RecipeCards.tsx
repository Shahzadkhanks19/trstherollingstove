"use client";

import type { ReactNode } from "react";

import type { MenuRecipeRecord, ProductionRecipeRecord, ProductionRunRecord } from "./types";
import { menuItemName } from "./types";

export function MenuRecipeCards({ rows, onEdit }: { rows: MenuRecipeRecord[]; onEdit: (record: MenuRecipeRecord) => void }) {
  return (
    <RecipeListShell title="Saved menu recipes" empty="No menu recipes saved yet.">
      {rows.map((row) => (
        <article key={row._id} className="rounded-2xl border border-[#eadfd6] bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-black text-[#173044]">{menuItemName(row.menuItemId)}</h3>
              <p className="mt-1 text-xs text-slate-500">{row.variantNameSnapshot} · {row.ingredients.length} ingredients · v{row.version}</p>
            </div>
            <StatusPill active={row.isActive} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-[#fff8f2] p-3 text-center">
            <Metric label="Yield" value={`${row.yieldQuantity} ${row.yieldUnit}`} />
            <Metric label="Prep" value={`${row.preparationTimeMinutes} min`} />
            <Metric label="Cook" value={`${row.cookingTimeMinutes} min`} />
          </div>
          <button type="button" onClick={() => onEdit(row)} className="mt-3 rounded-xl border border-[#ded3ca] px-4 py-2 text-[10px] font-black text-[#173044]">Edit recipe</button>
        </article>
      ))}
    </RecipeListShell>
  );
}

export function ProductionRecipeCards({ rows, onEdit, onProduce }: { rows: ProductionRecipeRecord[]; onEdit: (record: ProductionRecipeRecord) => void; onProduce: (record: ProductionRecipeRecord) => void }) {
  return (
    <RecipeListShell title="Saved production recipes" empty="No production recipes saved yet.">
      {rows.map((row) => (
        <article key={row._id} className="rounded-2xl border border-[#eadfd6] bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-black text-[#173044]">{row.name}</h3>
              <p className="mt-1 text-xs text-slate-500">{row.code} · Base {row.baseYieldQuantity} {row.yieldUnit} · v{row.version}</p>
            </div>
            <StatusPill active={row.isActive} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-[#fff8f2] p-3 text-center">
            <Metric label="Inputs" value={String(row.ingredients.length)} />
            <Metric label="Outputs" value={String(row.outputs.length)} />
            <Metric label="Shelf life" value={`${row.shelfLifeHours} h`} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => onEdit(row)} className="rounded-xl border border-[#ded3ca] px-4 py-2 text-[10px] font-black text-[#173044]">Edit</button>
            <button type="button" onClick={() => onProduce(row)} className="rounded-xl bg-[#C8102E] px-4 py-2 text-[10px] font-black text-white">Start production</button>
          </div>
        </article>
      ))}
    </RecipeListShell>
  );
}

export function ProductionRunCards({ rows }: { rows: ProductionRunRecord[] }) {
  return (
    <RecipeListShell title="Completed production batches" empty="No production batches completed yet.">
      {rows.map((row) => (
        <article key={row._id} className="rounded-2xl border border-[#eadfd6] bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-[#173044]">{row.recipeNameSnapshot}</h3>
              <p className="mt-1 break-all text-[10px] font-bold text-slate-500">{row.batchNumber}</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase text-emerald-700">Completed</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-[#fff8f2] p-3 text-center sm:grid-cols-4">
            <Metric label="Target" value={`${row.targetYield} ${row.yieldUnit}`} />
            <Metric label="Actual" value={`${row.actualYield} ${row.yieldUnit}`} />
            <Metric label="Wastage" value={`${row.actualWastageQuantity} ${row.yieldUnit}`} />
            <Metric label="Created" value={new Date(row.createdAt).toLocaleDateString("en-IN")} />
          </div>
          {row.expiresAt ? <p className="mt-3 text-xs font-bold text-amber-700">Expires: {new Date(row.expiresAt).toLocaleString("en-IN")}</p> : null}
        </article>
      ))}
    </RecipeListShell>
  );
}

function RecipeListShell({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section className="rounded-3xl border border-[#eadfd6] bg-[#fffdfb] p-5">
      <h2 className="text-base font-black text-[#173044]">{title}</h2>
      <div className="mt-4 space-y-3">{hasChildren ? children : <p className="py-12 text-center text-sm text-slate-400">{empty}</p>}</div>
    </section>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{active ? "Active" : "Inactive"}</span>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[8px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 break-words text-xs font-black text-[#173044]">{value}</p></div>;
}
