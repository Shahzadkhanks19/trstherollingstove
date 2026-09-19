"use client";

import type { Dispatch, SetStateAction } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faIndianRupeeSign } from "@fortawesome/free-solid-svg-icons";
import type { ItemForm, MenuItem } from "@/components/admin/menu/admin-menu.types";
import { Field } from "@/components/admin/menu/AdminMenuUi";

export function AdminMenuEditorBasics({
  form, setForm, categories, isComboCategory, hasRequiredVariants, itemDiscountType, itemDiscountValue,
  onCategoryChange, onDiscountTypeChange, onDiscountValueChange, onApplyDiscount, onRemoveDiscount,
}: {
  form: ItemForm; setForm: Dispatch<SetStateAction<ItemForm>>; categories: Array<{_id:string;name:string;isActive:boolean}>;
  isComboCategory:boolean; hasRequiredVariants:boolean; itemDiscountType:"percentage"|"fixed"; itemDiscountValue:string;
  onCategoryChange:(value:string)=>void; onDiscountTypeChange:(value:"percentage"|"fixed")=>void; onDiscountValueChange:(value:string)=>void; onApplyDiscount:()=>void; onRemoveDiscount:()=>void;
}) {
  return <>
    <div className="rounded-2xl border border-[#eadfd5] bg-[#fff8f2] px-4 py-3 text-xs leading-5 text-[#6d5f55]">{isComboCategory?"Combo mode is active. Select at least two menu items below; the original price, savings and discount are calculated automatically. Enter only the combo selling price.":"For regular items, enter one selling price. For Pizza, select the Pizza category and enter separate prices for Small, Medium and Large."}</div>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Item name *"><input value={form.name} onChange={(e)=>setForm(c=>({...c,name:e.target.value}))} className="field"/></Field>
      <Field label="Slug"><input value={form.slug} onChange={(e)=>setForm(c=>({...c,slug:e.target.value}))} placeholder="Generated automatically" className="field"/></Field>
      <Field label="Category *"><select value={form.categoryId} onChange={(e)=>onCategoryChange(e.target.value)} className="field"><option value="">Select category</option>{categories.filter(c=>c.isActive).map(c=><option key={c._id} value={c._id}>{c.name}</option>)}</select></Field>
      {!hasRequiredVariants&&<Field label={isComboCategory?"Combo selling price *":"Selling price *"}><div className="relative"><FontAwesomeIcon icon={faIndianRupeeSign} className="absolute left-3 top-1/2 h-3 -translate-y-1/2 text-[#8c7f76]"/><input type="number" min="0" step="0.01" value={form.basePrice} onChange={(e)=>setForm(c=>({...c,basePrice:e.target.value}))} className="field price-field"/></div></Field>}
      {!isComboCategory&&!hasRequiredVariants&&<Field label="Original / crossed price (optional)"><div className="relative"><FontAwesomeIcon icon={faIndianRupeeSign} className="absolute left-3 top-1/2 h-3 -translate-y-1/2 text-[#8c7f76]"/><input type="number" min="0" step="0.01" value={form.compareAtPrice} onChange={(e)=>setForm(c=>({...c,compareAtPrice:e.target.value}))} placeholder="Shown crossed out" className="field price-field"/></div></Field>}
      {!isComboCategory&&<section className="sm:col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4"><h4 className="text-xs font-black text-[#122b3c]">Item discount calculator</h4><p className="mt-1 text-[10px] font-semibold leading-4 text-emerald-800">Apply one percentage or fixed-amount discount to this item. For items with sizes, it updates every variant and keeps each original price crossed out.</p><div className="mt-3 grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)_auto_auto]"><select value={itemDiscountType} onChange={(e)=>onDiscountTypeChange(e.target.value as "percentage"|"fixed")} className="field"><option value="percentage">Percentage (%)</option><option value="fixed">Fixed amount (₹)</option></select><input type="number" min="0.01" max={itemDiscountType==="percentage"?"99.99":undefined} step="0.01" value={itemDiscountValue} onChange={(e)=>onDiscountValueChange(e.target.value)} placeholder={itemDiscountType==="percentage"?"Example: 20":"Example: 50"} className="field"/><button type="button" onClick={onApplyDiscount} className="h-11 rounded-xl bg-emerald-700 px-4 text-xs font-black text-white">Apply</button><button type="button" onClick={onRemoveDiscount} className="h-11 rounded-xl border border-emerald-300 bg-white px-4 text-xs font-black text-emerald-800">Remove</button></div></section>}
      {!isComboCategory&&<Field label="Preparation time"><input type="number" min="0" max="240" value={form.preparationTimeMinutes} onChange={(e)=>setForm(c=>({...c,preparationTimeMinutes:e.target.value}))} className="field"/></Field>}
      {!isComboCategory&&<Field label="Spice level"><select value={form.spiceLevel} onChange={(e)=>setForm(c=>({...c,spiceLevel:e.target.value as MenuItem["spiceLevel"]}))} className="field"><option value="none">None</option><option value="mild">Mild</option><option value="medium">Medium</option><option value="hot">Hot</option></select></Field>}
      <Field label="Display order"><input type="number" value={form.sortOrder} onChange={(e)=>setForm(c=>({...c,sortOrder:e.target.value}))} className="field"/></Field>
      {!isComboCategory&&<Field label="Tags"><input value={form.tags} onChange={(e)=>setForm(c=>({...c,tags:e.target.value}))} placeholder="pizza, cheese, bestseller" className="field"/></Field>}
    </div>
    <Field label="Menu card description"><textarea value={form.shortDescription} onChange={(e)=>setForm(c=>({...c,shortDescription:e.target.value}))} rows={3} placeholder="Short description shown on menu cards" className="field min-h-24 py-3"/></Field>
    <Field label="Detailed item description"><textarea value={form.description} onChange={(e)=>setForm(c=>({...c,description:e.target.value}))} rows={5} placeholder="Ingredients, taste, preparation details and serving information" className="field min-h-32 py-3"/></Field>
  </>;
}
