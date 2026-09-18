"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRotateRight, faChevronLeft, faChevronRight, faDownload, faFilter, faSearch } from "@fortawesome/free-solid-svg-icons";
import type { Category } from "@/components/admin/menu/admin-menu.types";
import { BulkButton, FilterSelect } from "@/components/admin/menu/AdminMenuUi";

export function AdminMenuCatalogControls({
  categories, searchInput, showFilters, categoryId, status, featured, bestseller, loading,
  selectedCount, canUpdate, page, limit, total, totalPages, itemCount,
  onSearchInputChange, onToggleFilters, onCategoryChange, onStatusChange, onFeaturedChange, onBestsellerChange,
  onRefresh, onBulkAction, onOpenBulkDiscount, onPageChange, onLimitChange,
}: {
  categories: Category[]; searchInput: string; showFilters: boolean; categoryId: string; status: string; featured: string; bestseller: string; loading: boolean;
  selectedCount: number; canUpdate: boolean; page: number; limit: number; total: number; totalPages: number; itemCount: number;
  onSearchInputChange: (value:string)=>void; onToggleFilters:()=>void; onCategoryChange:(value:string)=>void; onStatusChange:(value:string)=>void; onFeaturedChange:(value:string)=>void; onBestsellerChange:(value:string)=>void;
  onRefresh:()=>void; onBulkAction:(action:string)=>void; onOpenBulkDiscount:()=>void; onPageChange:(page:number)=>void; onLimitChange:(limit:number)=>void;
}) {
  function exportCsv() {
    void fetch("/api/v1/admin/menu/items/export").then(async (response) => {
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = "menu-items.csv"; anchor.click(); URL.revokeObjectURL(url);
    });
  }
  return <>
    <div className="border-b border-[#eee4dc] p-4 sm:p-5">
      <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-[minmax(260px,1fr)_auto_auto_auto] lg:items-center">
        <label className="relative col-span-2 min-w-0 lg:col-span-1"><FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 h-4 -translate-y-1/2 text-[#9b8e85]"/><input value={searchInput} onChange={(e)=>onSearchInputChange(e.target.value)} placeholder="Search name, description or tags" className="h-11 w-full rounded-2xl border border-[#e5d9cf] bg-white pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-[#C8102E]"/></label>
        <button onClick={onToggleFilters} className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-2xl border border-[#e5d9cf] bg-white px-3 text-xs font-black text-[#122b3c] sm:px-4"><FontAwesomeIcon icon={faFilter}/> Filters</button>
        <button type="button" onClick={exportCsv} className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-2xl border border-[#e5d9cf] bg-white px-3 text-xs font-black text-[#122b3c] sm:px-4"><FontAwesomeIcon icon={faDownload}/> Export CSV</button>
        <button onClick={onRefresh} aria-label="Refresh menu" className="col-span-2 grid h-11 w-full place-items-center rounded-2xl border border-[#e5d9cf] bg-white text-[#122b3c] sm:col-span-1 sm:w-11"><FontAwesomeIcon icon={faArrowRotateRight} spin={loading}/></button>
      </div>
      <AnimatePresence initial={false}>{showFilters&&<motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden"><div className="grid min-w-0 gap-3 pt-4 sm:grid-cols-2 2xl:grid-cols-4">
        <FilterSelect label="Category" value={categoryId} onChange={onCategoryChange} options={[{value:"",label:"All categories"},...categories.map(c=>({value:c._id,label:c.name}))]}/>
        <FilterSelect label="Status" value={status} onChange={onStatusChange} options={[{value:"all",label:"All statuses"},{value:"active",label:"Active"},{value:"inactive",label:"Inactive"},{value:"available",label:"Available"},{value:"unavailable",label:"Unavailable"}]}/>
        <FilterSelect label="Featured" value={featured} onChange={onFeaturedChange} options={[{value:"all",label:"All items"},{value:"true",label:"Featured"},{value:"false",label:"Not featured"}]}/>
        <FilterSelect label="Bestseller" value={bestseller} onChange={onBestsellerChange} options={[{value:"all",label:"All items"},{value:"true",label:"Bestsellers"},{value:"false",label:"Not bestseller"}]}/>
      </div></motion.div>}</AnimatePresence>
    </div>
    {selectedCount>0&&canUpdate&&<div className="flex items-center gap-2 overflow-x-auto border-b border-[#eee4dc] bg-[#fff8f2] px-4 py-3 text-xs font-bold"><span className="mr-2 shrink-0 text-[#6d625a]">{selectedCount} selected</span>
      {["activate","deactivate","mark_available","mark_unavailable","feature","mark_bestseller"].map((action)=><BulkButton key={action} label={({activate:"Activate",deactivate:"Deactivate",mark_available:"Available",mark_unavailable:"Unavailable",feature:"Feature",mark_bestseller:"Bestseller"} as Record<string,string>)[action]} onClick={()=>onBulkAction(action)}/>)}
      <BulkButton label="Apply discount" onClick={onOpenBulkDiscount}/><BulkButton label="Remove discount" onClick={()=>onBulkAction("remove_discount")}/>
    </div>}
    <div className="flex min-w-0 flex-col gap-3 border-t border-[#eee4dc] px-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><p className="text-xs font-bold text-[#81746b]">Showing {itemCount} of {total} items</p><div className="grid w-full grid-cols-[minmax(72px,1fr)_36px_minmax(64px,auto)_36px] items-center gap-2 sm:flex sm:w-auto">
      <select value={limit} onChange={(e)=>onLimitChange(Number(e.target.value))} className="h-9 rounded-xl border border-[#e5d9cf] bg-white px-3 text-xs font-bold"><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select>
      <button disabled={page<=1} onClick={()=>onPageChange(Math.max(1,page-1))} className="grid h-9 w-9 place-items-center rounded-xl border border-[#e5d9cf] disabled:opacity-40"><FontAwesomeIcon icon={faChevronLeft}/></button><span className="min-w-20 text-center text-xs font-black text-[#122b3c]">{page} / {totalPages}</span><button disabled={page>=totalPages} onClick={()=>onPageChange(Math.min(totalPages,page+1))} className="grid h-9 w-9 place-items-center rounded-xl border border-[#e5d9cf] disabled:opacity-40"><FontAwesomeIcon icon={faChevronRight}/></button>
    </div></div>
  </>;
}
