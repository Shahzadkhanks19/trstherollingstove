"use client";

import type { Dispatch, SetStateAction } from "react";
import type { ItemForm } from "@/components/admin/menu/admin-menu.types";
import { Field, Toggle } from "@/components/admin/menu/AdminMenuUi";
import { localDateTimeInputValue } from "@/lib/validation/dateTime";

export function AdminMenuEditorPublishing({form,setForm,isComboCategory}:{form:ItemForm;setForm:Dispatch<SetStateAction<ItemForm>>;isComboCategory:boolean}) {
  const set=(patch:Partial<ItemForm>)=>setForm(c=>({...c,...patch}));
  return <>
    <div className="grid gap-3 sm:grid-cols-2">
      <Toggle label="Dine-in" checked={form.availableForDineIn} onChange={v=>set({availableForDineIn:v})}/>
      <Toggle label="Pickup" checked={form.availableForTakeaway} onChange={v=>set({availableForTakeaway:v})}/>
      <Toggle label="Available" checked={form.isAvailable} onChange={v=>set({isAvailable:v})}/>
      <Toggle label="Active" checked={form.isActive} onChange={v=>set({isActive:v})}/>
      {!isComboCategory&&<>
        <Toggle label="Featured" checked={form.isFeatured} onChange={v=>set({isFeatured:v})}/>
        <Toggle label="Bestseller" checked={form.isBestseller} onChange={v=>set({isBestseller:v})}/>
        <Toggle label="Today's 24-hour special" checked={form.isTodaysSpecialOffer} onChange={v=>setForm(c=>({...c,isTodaysSpecialOffer:v,todaysSpecialOfferStartsAt:v?c.todaysSpecialOfferStartsAt||localDateTimeInputValue():""}))}/>
        <Toggle label="Track inventory" checked={form.trackInventory} onChange={v=>set({trackInventory:v})}/>
      </>}
    </div>
    {!isComboCategory&&form.isTodaysSpecialOffer&&<div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4"><Field label="Special offer starts"><input type="datetime-local" value={form.todaysSpecialOfferStartsAt} onChange={e=>set({todaysSpecialOfferStartsAt:e.target.value})} className="field"/></Field><p className="mt-2 text-[10px] font-semibold leading-4 text-amber-800">The item appears in Today&apos;s Hot Offers and receives a Today&apos;s Special Offer tag on the Menu page for exactly 24 hours from this start time. The offer designation disappears automatically when the window ends.</p></div>}
  </>;
}
