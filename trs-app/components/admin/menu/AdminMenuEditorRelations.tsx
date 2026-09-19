"use client";

import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";
import type { ItemForm, MenuItem, ModifierGroup } from "@/components/admin/menu/admin-menu.types";
import { Field } from "@/components/admin/menu/AdminMenuUi";
import { isAllowedNaanModifierGroup } from "@/lib/menu-special-config";

export function AdminMenuEditorRelations({form,setForm,modifierGroups,items,editingId,isNaanCategory}:{form:ItemForm;setForm:Dispatch<SetStateAction<ItemForm>>;modifierGroups:ModifierGroup[];items:MenuItem[];editingId:string|null;isNaanCategory:boolean}) {
  return <>
    <section className="rounded-[22px] border border-[#eadfd5] bg-white p-4">
      <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-[#122b3c]">Customisation & add-ons</p><p className="mt-1 text-xs leading-5 text-[#786b62]">{isNaanCategory?"Only the platter choice and Extra Naan groups are available for Chur-Chur Naan.":"Attach reusable groups such as Extra Cheese, Toppings, Dips and other item add-ons."}</p></div><Link href="/admin/menu/modifier-groups" className="shrink-0 rounded-xl border border-[#e5d9cf] px-3 py-2 text-[10px] font-black text-[#122b3c]">Manage groups</Link></div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">{modifierGroups.filter(g=>g.isActive&&(!isNaanCategory||isAllowedNaanModifierGroup(g.name,g.internalName))).map(g=>{const checked=form.modifierGroupIds.includes(g._id);return <label key={g._id} className={`rounded-2xl border p-3 text-xs font-bold ${checked?"border-[#C8102E] bg-[#fff5f5]":"border-[#eadfd5] bg-[#fffaf6]"}`}><span className="flex items-center gap-2"><input type="checkbox" checked={checked} onChange={e=>setForm(c=>({...c,modifierGroupIds:e.target.checked?[...c.modifierGroupIds,g._id]:c.modifierGroupIds.filter(id=>id!==g._id)}))} className="accent-[#C8102E]"/>{g.name}</span><span className="mt-1 block text-[10px] font-medium text-[#81746b]">{g.isRequired?"Required":"Optional"} · {g.selectionType} · {g.options.length} options</span></label>})}</div>
    </section>
    <section className="rounded-[22px] border border-[#eadfd5] bg-white p-4">
      <p className="text-sm font-black text-[#122b3c]">Mostly bought together</p><p className="mt-1 text-xs leading-5 text-[#786b62]">Select complementary menu items shown beneath this product. Customers open each recommendation separately to customise and add it.</p>
      <div className="mt-4 grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2">{items.filter(i=>i._id!==editingId).map(i=>{const checked=form.frequentlyOrderedWithIds.includes(i._id);return <label key={i._id} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${checked?"border-[#C8102E] bg-[#fff5f5]":"border-[#eadfd5]"}`}><input type="checkbox" checked={checked} onChange={e=>setForm(c=>({...c,frequentlyOrderedWithIds:e.target.checked?[...c.frequentlyOrderedWithIds,i._id]:c.frequentlyOrderedWithIds.filter(id=>id!==i._id)}))} className="accent-[#C8102E]"/><span className="truncate">{i.name}</span></label>})}</div>
    </section>
    <Field label="Allergens"><input value={form.allergens} onChange={e=>setForm(c=>({...c,allergens:e.target.value}))} placeholder="gluten, dairy, nuts" className="field"/></Field>
  </>;
}
