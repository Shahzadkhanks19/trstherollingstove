"use client";

import type { ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import type { PosCategory } from "@/types/pos";

export function PosMobileCategoryDrawer({
  open, categories, activeCategory, onSelect, onClose,
}: {
  open: boolean;
  categories: PosCategory[];
  activeCategory: string;
  onSelect: (categoryId: string) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  const select = (id: string) => { onSelect(id); onClose(); };
  return <div className="fixed inset-0 z-[150] lg:hidden">
    <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-label="Close category browser" />
    <section role="dialog" aria-modal="true" aria-labelledby="mobile-category-title" className="absolute inset-x-0 bottom-0 flex max-h-[82dvh] flex-col overflow-hidden rounded-t-[28px] bg-[#fffdf9] shadow-2xl">
      <header className="flex shrink-0 items-center justify-between border-b border-[#e8ddd3] px-5 py-4">
        <div><p className="text-[9px] font-black uppercase tracking-[.2em] text-[#C8102E]">Menu navigation</p><h2 id="mobile-category-title" className="mt-1 text-xl font-black text-[#122b3c]">Browse categories</h2></div>
        <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-[#e5d9cf] bg-white text-[#122b3c] shadow-sm" aria-label="Close category browser"><FontAwesomeIcon icon={faXmark} /></button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <button type="button" onClick={() => select("all")} className={`min-h-14 rounded-2xl border px-4 py-3 text-left text-sm font-black transition ${activeCategory === "all" ? "border-[#111820] bg-[#111820] text-white shadow-lg" : "border-[#e5d9cf] bg-white text-[#122b3c]"}`}>All Items</button>
          {categories.map((category) => <button key={category.id} type="button" onClick={() => select(category.id)} className={`min-h-14 rounded-2xl border px-4 py-3 text-left text-sm font-black transition ${activeCategory === category.id ? "border-[#C8102E] bg-red-50 text-[#C8102E] shadow-sm" : "border-[#e5d9cf] bg-white text-[#122b3c]"}`}>{category.name}</button>)}
        </div>
      </div>
    </section>
  </div>;
}

export function PosMobileCartDrawer({ open, children, onClose }: { open: boolean; children: ReactNode; onClose: () => void }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-[110] min-[1400px]:hidden">
    <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-label="Close current order" />
    <section className="absolute inset-y-0 right-0 w-full max-w-md bg-[#fffdf9] shadow-2xl">
      <button type="button" onClick={onClose} className="absolute right-4 top-4 z-30 grid h-10 w-10 place-items-center rounded-xl border border-[#e5d9cf] bg-white text-[#122b3c] shadow-lg" aria-label="Close current order"><FontAwesomeIcon icon={faXmark} /></button>
      {children}
    </section>
  </div>;
}
