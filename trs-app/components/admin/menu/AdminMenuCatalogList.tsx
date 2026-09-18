"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBoxOpen, faEye, faEyeSlash, faFire, faPen, faStar, faTrash, faUtensils } from "@fortawesome/free-solid-svg-icons";
import type { MenuItem } from "@/components/admin/menu/admin-menu.types";
import { money } from "@/components/admin/menu/admin-menu.types";
import { ActionButton, IconBadge, ItemImage, MiniBadge, SkeletonRow } from "@/components/admin/menu/AdminMenuUi";

export function AdminMenuCatalogList({
  items, loading, selected, canUpdate, canDelete, acting, onToggleSelected, onToggleAll, onEdit, onDelete, onToggleAvailability,
}: {
  items: MenuItem[]; loading: boolean; selected: string[]; canUpdate: boolean; canDelete: boolean; acting: boolean;
  onToggleSelected: (id: string) => void; onToggleAll: () => void; onEdit: (id: string) => void; onDelete: (item: MenuItem) => void; onToggleAvailability: (item: MenuItem) => void;
}) {
  const allSelected = items.length > 0 && items.every((item) => selected.includes(item._id));
  return <>
    <div className="hidden overflow-x-auto xl:block">
      <table className="w-full min-w-[980px] text-left">
        <thead className="border-b border-[#eee4dc] bg-[#faf6f1] text-[10px] font-black uppercase tracking-[.12em] text-[#887b72]"><tr>
          <th className="px-5 py-4"><input type="checkbox" checked={allSelected} onChange={onToggleAll} /></th><th className="px-3 py-4">Item</th><th className="px-3 py-4">Category</th><th className="px-3 py-4">Price</th><th className="px-3 py-4">Service</th><th className="px-3 py-4">Availability</th><th className="px-3 py-4">Merchandising</th><th className="px-5 py-4 text-right">Actions</th>
        </tr></thead>
        <tbody className="divide-y divide-[#f0e7df]">
          {loading ? Array.from({length:6}).map((_,i)=><SkeletonRow key={i}/>) : items.map((item)=><tr key={item._id} className="transition hover:bg-[#fffaf5]">
            <td className="px-5 py-4"><input type="checkbox" checked={selected.includes(item._id)} onChange={()=>onToggleSelected(item._id)}/></td>
            <td className="px-3 py-4"><div className="flex items-center gap-3"><ItemImage item={item}/><div><p className="max-w-[220px] truncate text-sm font-black text-[#122b3c]">{item.name}</p><p className="mt-1 text-[10px] font-bold text-[#94877d]">{item.preparationTimeMinutes} min · Sort {item.sortOrder}</p></div></div></td>
            <td className="px-3 py-4 text-xs font-bold text-[#62584f]">{typeof item.categoryId==="string"?"—":item.categoryId.name}</td>
            <td className="px-3 py-4">{item.compareAtPrice!=null&&item.compareAtPrice>item.basePrice&&<div className="flex items-center gap-2"><p className="text-xs font-bold text-[#9b8e85] line-through">{money.format(item.compareAtPrice)}</p><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-700">{Math.round(((item.compareAtPrice-item.basePrice)/item.compareAtPrice)*100)}% OFF</span></div>}<p className="text-sm font-black text-[#122b3c]">{money.format(item.basePrice)}</p></td>
            <td className="px-3 py-4"><div className="flex gap-1"><MiniBadge active={item.availableForDineIn} label="Dine-in"/><MiniBadge active={item.availableForTakeaway} label="Pickup"/></div></td>
            <td className="px-3 py-4"><button disabled={!canUpdate||acting} onClick={()=>onToggleAvailability(item)} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${item.isAvailable?"bg-emerald-50 text-emerald-700":"bg-red-50 text-red-700"}`}><FontAwesomeIcon icon={item.isAvailable?faEye:faEyeSlash}/>{item.isAvailable?"Available":"Unavailable"}</button></td>
            <td className="px-3 py-4"><div className="flex gap-1">{item.isFeatured&&<IconBadge icon={faStar} label="Featured"/>}{item.isBestseller&&<IconBadge icon={faFire} label="Bestseller"/>}{item.isTodaysSpecialOffer&&<IconBadge icon={faFire} label="Today's Special Offer"/>}{item.trackInventory&&<IconBadge icon={faBoxOpen} label="Tracked"/>}</div></td>
            <td className="px-5 py-4"><div className="flex justify-end gap-2">{canUpdate&&<ActionButton icon={faPen} label="Edit" onClick={()=>onEdit(item._id)}/>} {canDelete&&<ActionButton icon={faTrash} label="Delete" danger onClick={()=>onDelete(item)}/>}</div></td>
          </tr>)}
        </tbody>
      </table>
    </div>
    <div className="divide-y divide-[#eee4dc] xl:hidden">
      {loading ? Array.from({length:5}).map((_,i)=><div key={i} className="m-4 h-32 animate-pulse rounded-2xl bg-[#f1ebe5]"/>) : items.map((item)=><article key={item._id} className="min-w-0 p-3 sm:p-4"><div className="flex min-w-0 gap-3"><ItemImage item={item}/><div className="min-w-0 flex-1"><div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:justify-between"><div><h3 className="truncate text-sm font-black text-[#122b3c]">{item.name}</h3><p className="mt-1 text-[10px] font-bold text-[#8b7e75]">{typeof item.categoryId==="string"?"Uncategorised":item.categoryId.name}</p></div><div className="shrink-0 text-right">{item.compareAtPrice!=null&&item.compareAtPrice>item.basePrice&&<p className="text-[10px] font-bold text-[#9b8e85] line-through">{money.format(item.compareAtPrice)}</p>}<p className="text-sm font-black text-[#C8102E]">{money.format(item.basePrice)}</p></div></div><div className="mt-3 flex flex-wrap gap-1"><MiniBadge active={item.isActive} label={item.isActive?"Active":"Inactive"}/><MiniBadge active={item.isAvailable} label={item.isAvailable?"Available":"Unavailable"}/>{item.isFeatured&&<IconBadge icon={faStar} label="Featured"/>}{item.isBestseller&&<IconBadge icon={faFire} label="Bestseller"/>}{item.isTodaysSpecialOffer&&<IconBadge icon={faFire} label="Today's Special Offer"/>}</div></div></div><div className="mt-4 flex flex-col gap-3 border-t border-[#eee4dc] pt-3 sm:flex-row sm:items-center sm:justify-between"><label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#7d7068]"><input type="checkbox" checked={selected.includes(item._id)} onChange={()=>onToggleSelected(item._id)}/> Select</label><div className="flex w-full gap-2 sm:w-auto sm:justify-end">{canUpdate&&<ActionButton icon={faPen} label="Edit" onClick={()=>onEdit(item._id)}/>} {canDelete&&<ActionButton icon={faTrash} label="Delete" danger onClick={()=>onDelete(item)}/>}</div></div></article>)}
    </div>
    {!loading&&!items.length&&<div className="grid place-items-center px-6 py-20 text-center"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#fff0e8] text-[#C8102E]"><FontAwesomeIcon icon={faUtensils}/></span><h3 className="mt-4 text-lg font-black text-[#122b3c]">No menu items found</h3><p className="mt-2 max-w-sm text-sm font-medium text-[#7d7068]">Adjust the filters or add the first item to this catalog.</p></div>}
  </>;
}
