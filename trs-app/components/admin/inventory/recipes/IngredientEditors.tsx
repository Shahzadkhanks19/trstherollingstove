"use client";

import type { ReactNode } from "react";

import type {
  InventoryItemOption,
  MenuIngredientForm,
  ProductionIngredientForm,
  ProductionOutputForm,
} from "./types";

function InventorySelect({ value, inventory, onChange, output = false }: { value: string; inventory: InventoryItemOption[]; onChange: (value: string) => void; output?: boolean }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
      className="h-10 min-w-0 rounded-lg border border-[#ded3ca] bg-white px-2 text-xs outline-none focus:border-[#C8102E]"
      aria-label={output ? "Prepared stock output" : "Inventory ingredient"}
    >
      <option value="">{output ? "Select prepared stock item" : "Select stock item"}</option>
      {inventory.map((item) => (
        <option key={item._id} value={item._id}>{item.name} ({item.unit})</option>
      ))}
    </select>
  );
}

export function MenuIngredientEditor({ lines, inventory, onChange }: { lines: MenuIngredientForm[]; inventory: InventoryItemOption[]; onChange: (lines: MenuIngredientForm[]) => void }) {
  const addLine = () => onChange([...lines, { inventoryItemId: "", quantity: 0, wastagePercent: 0, note: "" }]);

  return (
    <IngredientSection title="Ingredients per yield" onAdd={addLine}>
      {lines.map((line, index) => (
        <div key={`${index}-${line.inventoryItemId}`} className="grid gap-2 rounded-xl border border-[#eadfd6] bg-[#fffdfb] p-3 sm:grid-cols-[1.45fr_.55fr_.55fr_auto]">
          <InventorySelect value={line.inventoryItemId} inventory={inventory} onChange={(inventoryItemId) => onChange(lines.map((item, itemIndex) => itemIndex === index ? { ...item, inventoryItemId } : item))} />
          <input aria-label="Ingredient quantity" type="number" min="0" step="0.001" value={line.quantity} onChange={(event) => onChange(lines.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: Number(event.currentTarget.value) || 0 } : item))} className="h-10 rounded-lg border border-[#ded3ca] px-2 text-xs" placeholder="Qty" />
          <input aria-label="Ingredient wastage percentage" type="number" min="0" max="100" step="0.1" value={line.wastagePercent} onChange={(event) => onChange(lines.map((item, itemIndex) => itemIndex === index ? { ...item, wastagePercent: Number(event.currentTarget.value) || 0 } : item))} className="h-10 rounded-lg border border-[#ded3ca] px-2 text-xs" placeholder="Waste %" />
          <RemoveButton onClick={() => onChange(lines.filter((_, itemIndex) => itemIndex !== index))} />
          <input aria-label="Ingredient note" value={line.note} onChange={(event) => onChange(lines.map((item, itemIndex) => itemIndex === index ? { ...item, note: event.currentTarget.value } : item))} className="h-10 rounded-lg border border-[#ded3ca] px-2 text-xs sm:col-span-full" placeholder="Optional preparation note" />
        </div>
      ))}
    </IngredientSection>
  );
}

export function ProductionIngredientEditor({ lines, inventory, onChange }: { lines: ProductionIngredientForm[]; inventory: InventoryItemOption[]; onChange: (lines: ProductionIngredientForm[]) => void }) {
  const addLine = () => onChange([...lines, { inventoryItemId: "", quantityPerBaseYield: 0, wastagePercent: 0, note: "" }]);

  return (
    <IngredientSection title="Raw-material inputs per base yield" onAdd={addLine}>
      {lines.map((line, index) => (
        <div key={`${index}-${line.inventoryItemId}`} className="grid gap-2 rounded-xl border border-[#eadfd6] bg-[#fffdfb] p-3 sm:grid-cols-[1.45fr_.55fr_.55fr_auto]">
          <InventorySelect value={line.inventoryItemId} inventory={inventory} onChange={(inventoryItemId) => onChange(lines.map((item, itemIndex) => itemIndex === index ? { ...item, inventoryItemId } : item))} />
          <input aria-label="Input quantity per base yield" type="number" min="0" step="0.001" value={line.quantityPerBaseYield} onChange={(event) => onChange(lines.map((item, itemIndex) => itemIndex === index ? { ...item, quantityPerBaseYield: Number(event.currentTarget.value) || 0 } : item))} className="h-10 rounded-lg border border-[#ded3ca] px-2 text-xs" placeholder="Qty" />
          <input aria-label="Input wastage percentage" type="number" min="0" max="100" step="0.1" value={line.wastagePercent} onChange={(event) => onChange(lines.map((item, itemIndex) => itemIndex === index ? { ...item, wastagePercent: Number(event.currentTarget.value) || 0 } : item))} className="h-10 rounded-lg border border-[#ded3ca] px-2 text-xs" placeholder="Waste %" />
          <RemoveButton onClick={() => onChange(lines.filter((_, itemIndex) => itemIndex !== index))} />
          <input aria-label="Input note" value={line.note} onChange={(event) => onChange(lines.map((item, itemIndex) => itemIndex === index ? { ...item, note: event.currentTarget.value } : item))} className="h-10 rounded-lg border border-[#ded3ca] px-2 text-xs sm:col-span-full" placeholder="Optional processing note" />
        </div>
      ))}
    </IngredientSection>
  );
}

export function ProductionOutputEditor({ lines, inventory, onChange }: { lines: ProductionOutputForm[]; inventory: InventoryItemOption[]; onChange: (lines: ProductionOutputForm[]) => void }) {
  const addLine = () => onChange([...lines, { inventoryItemId: "", quantityPerBaseYield: 0, note: "" }]);

  return (
    <IngredientSection title="Prepared-stock outputs" onAdd={addLine}>
      {lines.map((line, index) => (
        <div key={`${index}-${line.inventoryItemId}`} className="grid gap-2 rounded-xl border border-[#eadfd6] bg-[#fffdfb] p-3 sm:grid-cols-[1.45fr_.65fr_auto]">
          <InventorySelect output value={line.inventoryItemId} inventory={inventory} onChange={(inventoryItemId) => onChange(lines.map((item, itemIndex) => itemIndex === index ? { ...item, inventoryItemId } : item))} />
          <input aria-label="Output quantity per base yield" type="number" min="0" step="0.001" value={line.quantityPerBaseYield} onChange={(event) => onChange(lines.map((item, itemIndex) => itemIndex === index ? { ...item, quantityPerBaseYield: Number(event.currentTarget.value) || 0 } : item))} className="h-10 rounded-lg border border-[#ded3ca] px-2 text-xs" placeholder="Qty" />
          <RemoveButton onClick={() => onChange(lines.filter((_, itemIndex) => itemIndex !== index))} />
          <input aria-label="Output note" value={line.note} onChange={(event) => onChange(lines.map((item, itemIndex) => itemIndex === index ? { ...item, note: event.currentTarget.value } : item))} className="h-10 rounded-lg border border-[#ded3ca] px-2 text-xs sm:col-span-full" placeholder="Optional output note, e.g. small base" />
        </div>
      ))}
    </IngredientSection>
  );
}

function IngredientSection({ title, onAdd, children }: { title: string; onAdd: () => void; children: ReactNode }) {
  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-xs font-black text-[#173044]">{title}</h3>
        <button type="button" onClick={onAdd} className="rounded-lg bg-red-50 px-3 py-2 text-[10px] font-black text-[#C8102E]">+ Add line</button>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-label="Remove line" className="h-10 rounded-lg bg-red-50 px-3 text-sm font-black text-red-700">×</button>;
}
