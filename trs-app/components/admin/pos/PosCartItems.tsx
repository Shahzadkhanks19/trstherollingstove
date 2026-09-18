"use client";

import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMinus, faPlus, faReceipt, faUtensils, faXmark } from "@fortawesome/free-solid-svg-icons";
import type { PosCartLine } from "@/types/pos";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function PosCartItems({
  cart, onChangeQuantity, onSetQuantity, onRemove, onLineNoteChange,
}: {
  cart: PosCartLine[];
  onChangeQuantity: (lineId: string, change: number) => void;
  onSetQuantity: (lineId: string, quantity: number) => void;
  onRemove: (lineId: string) => void;
  onLineNoteChange: (lineId: string, note: string) => void;
}) {
  if (!cart.length) return (
    <div className="grid h-full min-h-64 place-items-center text-center"><div>
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-[#f3ece5] text-xl text-[#C8102E]"><FontAwesomeIcon icon={faReceipt} /></span>
      <h3 className="mt-4 text-base font-black text-[#122b3c]">Start a new order</h3>
      <p className="mx-auto mt-1 max-w-52 text-xs font-medium leading-5 text-[#8b7e75]">Select products from the catalogue to add them here.</p>
    </div></div>
  );
  return <div className="space-y-3">{cart.map((line) => (
    <article key={line.lineId} className="rounded-2xl border border-[#e8ddd3] bg-white p-3">
      <div className="flex gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#efe7df]">
          {line.imageUrl ? <Image src={line.imageUrl} alt="" fill sizes="56px" className="object-cover" unoptimized /> : <span className="grid h-full place-items-center text-[#C8102E]/45"><FontAwesomeIcon icon={faUtensils} /></span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-black text-[#122b3c]">{line.name}</h3>
              {line.variantName && <p className="mt-1 text-[10px] font-black text-[#756960]">{line.variantName}</p>}
              {line.modifiers.length > 0 && <div className="mt-1 space-y-0.5">{line.modifiers.map((modifier) => <p key={`${modifier.groupId}-${modifier.optionId}`} className="text-[9px] font-semibold leading-4 text-[#8b7e75]">+ {modifier.optionName}{modifier.quantity > 1 ? ` × ${modifier.quantity}` : ""}</p>)}</div>}
              <p className="mt-1 text-xs font-bold text-[#C8102E]">{money.format(line.unitPrice)}</p>
            </div>
            <button type="button" onClick={() => onRemove(line.lineId)} className="grid h-7 w-7 place-items-center rounded-lg text-[#a69990] hover:bg-red-50 hover:text-[#C8102E]" aria-label={`Remove ${line.name}`}><FontAwesomeIcon icon={faXmark} /></button>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex items-center rounded-xl bg-[#f3ece5] p-1">
              <button type="button" onClick={() => onChangeQuantity(line.lineId, -1)} className="grid h-7 w-7 place-items-center rounded-lg bg-white text-[#122b3c] shadow-sm" aria-label={`Decrease ${line.name}`}><FontAwesomeIcon icon={faMinus} className="h-2.5" /></button>
              <label className="relative min-w-10"><span className="sr-only">Quantity for {line.name}</span><input type="number" min={1} max={99} inputMode="numeric" value={line.quantity} onChange={(event) => onSetQuantity(line.lineId, Number(event.currentTarget.value))} className="h-7 w-10 bg-transparent text-center text-xs font-black text-[#122b3c] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" /></label>
              <button type="button" onClick={() => onChangeQuantity(line.lineId, 1)} className="grid h-7 w-7 place-items-center rounded-lg bg-[#111820] text-white shadow-sm" aria-label={`Increase ${line.name}`}><FontAwesomeIcon icon={faPlus} className="h-2.5" /></button>
            </div>
            <span className="text-sm font-black text-[#122b3c]">{money.format(line.unitPrice * line.quantity)}</span>
          </div>
          <label className="mt-3 block"><span className="sr-only">Note for {line.name}</span><input value={line.note} onChange={(event) => onLineNoteChange(line.lineId, event.currentTarget.value)} maxLength={240} placeholder="Item note (optional)" className="h-9 w-full rounded-xl border border-[#eadfd6] bg-[#fffdf9] px-3 text-xs font-semibold text-[#122b3c] outline-none transition placeholder:text-[#aa9e95] focus:border-[#C8102E] focus:ring-3 focus:ring-[#C8102E]/10" /></label>
        </div>
      </div>
    </article>
  ))}</div>;
}
