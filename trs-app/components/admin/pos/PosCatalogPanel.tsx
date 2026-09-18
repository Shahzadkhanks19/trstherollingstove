"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faMagnifyingGlass, faUtensils, faXmark } from "@fortawesome/free-solid-svg-icons";
import { CategoryRail, ProductCard } from "@/components/admin/pos/PosWorkspaceUi";
import type { PosCatalogItem, PosCategory } from "@/types/pos";

export function PosCatalogPanel({
  categories, items, activeCategory, query, mobileCategoriesOpen,
  onCategoryChange, onQueryChange, onOpenCategories, onAddItem,
}: {
  categories: PosCategory[];
  items: PosCatalogItem[];
  activeCategory: string;
  query: string;
  mobileCategoriesOpen: boolean;
  onCategoryChange: (categoryId: string) => void;
  onQueryChange: (query: string) => void;
  onOpenCategories: () => void;
  onAddItem: (item: PosCatalogItem) => void;
}) {
  const activeName = activeCategory === "all"
    ? "All items"
    : (categories.find((category) => category.id === activeCategory)?.name ?? "Menu");

  return (
    <main className="min-h-0 min-w-0 overflow-y-auto overscroll-contain p-3 sm:p-5 lg:p-6">
      <div className="mb-4 flex gap-3">
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">Search menu</span>
          <FontAwesomeIcon icon={faMagnifyingGlass} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9a8e85]" />
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search food, category or item..." className="h-12 w-full rounded-2xl border border-[#e5d9cf] bg-white pl-11 pr-11 text-sm font-semibold text-[#122b3c] outline-none transition focus:border-[#C8102E] focus:ring-4 focus:ring-[#C8102E]/10" />
          {query && <button type="button" onClick={() => onQueryChange("")} className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-[#8b7f76] hover:bg-[#f3ece5]" aria-label="Clear search"><FontAwesomeIcon icon={faXmark} /></button>}
        </label>
        <button type="button" onClick={onOpenCategories} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#e5d9cf] bg-white text-[#122b3c] transition hover:border-[#C8102E]/40 hover:text-[#C8102E] lg:hidden" aria-label="Browse categories" aria-haspopup="dialog" aria-expanded={mobileCategoriesOpen}><FontAwesomeIcon icon={faBars} /></button>
      </div>
      <div className="hidden lg:block"><CategoryRail categories={categories} activeCategory={activeCategory} onSelect={onCategoryChange} /></div>
      <div className="mb-4 mt-5 flex items-end justify-between gap-3">
        <div><h2 className="text-lg font-black tracking-[-.03em] text-[#122b3c]">{activeName}</h2><p className="mt-1 text-xs font-medium text-[#8b7e75]">{items.length} items available in this view</p></div>
      </div>
      {items.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 min-[1800px]:grid-cols-5">
          {items.map((item) => <ProductCard key={item.id} item={item} onAdd={onAddItem} />)}
        </div>
      ) : (
        <div className="grid min-h-72 place-items-center rounded-[26px] border border-dashed border-[#d9ccc2] bg-white/60 p-8 text-center">
          <div><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f3ece5] text-[#C8102E]"><FontAwesomeIcon icon={faUtensils} /></span><h3 className="mt-4 text-base font-black text-[#122b3c]">No matching items</h3><p className="mt-1 text-sm text-[#8b7e75]">Try a different search or category.</p></div>
        </div>
      )}
    </main>
  );
}
