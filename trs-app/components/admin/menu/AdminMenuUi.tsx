"use client";

/* eslint-disable @next/next/no-img-element */

import type { ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faUtensils } from "@fortawesome/free-solid-svg-icons";
import type { MenuItem } from "@/components/admin/menu/admin-menu.types";

export function ItemImage({ item }: { item: MenuItem }) {
  return item.imageUrl ? <img src={item.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-2xl object-cover ring-1 ring-[#e8ddd3]" /> : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#fff0e8] text-[#C8102E]"><FontAwesomeIcon icon={faUtensils} /></span>;
}
export function MiniBadge({ active, label }: { active: boolean; label: string }) {
  return <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{label}</span>;
}
export function IconBadge({ icon, label }: { icon: IconDefinition; label: string }) {
  return <span title={label} className="grid h-7 w-7 place-items-center rounded-full bg-amber-50 text-amber-700"><FontAwesomeIcon icon={icon} className="h-3" /></span>;
}
export function ActionButton({ icon, label, danger, onClick }: { icon: IconDefinition; label: string; danger?: boolean; onClick: () => void }) {
  return <button onClick={onClick} aria-label={label} title={label} className={`grid h-10 flex-1 place-items-center rounded-xl border transition sm:h-9 sm:w-9 sm:flex-none ${danger ? "border-red-100 text-red-600 hover:bg-red-50" : "border-[#e5d9cf] text-[#122b3c] hover:bg-[#f8f1eb]"}`}><FontAwesomeIcon icon={icon} className="h-3.5" /></button>;
}
export function BulkButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button onClick={onClick} className="shrink-0 rounded-xl border border-[#e5d9cf] bg-white px-3 py-2 text-[10px] font-black text-[#122b3c]">{label}</button>;
}
export function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return <label><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-[#81746b]">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-2xl border border-[#e5d9cf] bg-white px-3 text-xs font-bold outline-none focus:border-[#C8102E]">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-[#81746b]">{label}</span>{children}</label>;
}
export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex items-center justify-between rounded-2xl border border-[#e5d9cf] bg-white px-4 py-3 text-xs font-black text-[#122b3c]"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-[#C8102E]" /></label>;
}
export function SkeletonRow() {
  return <tr><td colSpan={8} className="px-5 py-3"><div className="h-14 animate-pulse rounded-2xl bg-[#f1ebe5]" /></td></tr>;
}
