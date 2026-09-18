"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCashRegister, faClock, faReceipt } from "@fortawesome/free-solid-svg-icons";
import { PosCashDrawerControl } from "@/components/admin/pos/PosCashDrawerControl";

export function PosWorkspaceHeader({
  cashierName, itemCount, queuedSales, editingTicketNumber, onOpenCart, onCancelEditing,
}: {
  cashierName: string;
  itemCount: number;
  queuedSales: number;
  editingTicketNumber?: string;
  onOpenCart: () => void;
  onCancelEditing: () => void;
}) {
  return (
    <header className="z-30 shrink-0 border-b border-[#e8ddd3] bg-[#fffdf9]/95 px-4 py-3 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#111820] text-[#E8A53A]"><FontAwesomeIcon icon={faCashRegister} /></div>
        <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[.22em] text-[#C8102E]">Counter workspace</p><h1 className="truncate text-xl font-black tracking-[-.04em] text-[#122b3c]">Point of Sale</h1></div>
        <div className="ml-auto hidden items-center gap-2 sm:flex">
          <PosCashDrawerControl />
          <a href="/admin/pos/operations" className="rounded-xl border border-[#e5d9cf] bg-white px-3 py-2 text-xs font-black text-[#122b3c] transition hover:border-[#C8102E]/40 hover:text-[#C8102E]">Running orders</a>
          <a href="/admin/pos/bills" className="rounded-xl border border-[#e5d9cf] bg-white px-3 py-2 text-xs font-black text-[#122b3c]">Bill history</a>
          <div className="flex items-center gap-2 rounded-2xl bg-[#f3ece5] px-3 py-2 text-xs font-bold text-[#6d625a]"><FontAwesomeIcon icon={faClock} className="text-[#C8102E]" />{cashierName}</div>
        </div>
        <button type="button" disabled={itemCount === 0} onClick={onOpenCart} className="relative grid h-11 w-11 place-items-center rounded-2xl bg-[#C8102E] text-white shadow-lg transition disabled:cursor-not-allowed disabled:bg-[#d6cbc3] disabled:shadow-none min-[1400px]:hidden" aria-label={itemCount > 0 ? "Open current order" : "Current order is empty"} title={itemCount > 0 ? "Open current order" : "Add an item to open the current order"}>
          <FontAwesomeIcon icon={faReceipt} />
          {itemCount > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#E8A53A] px-1 text-[9px] font-black text-[#111820]">{itemCount}</span>}
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:hidden">
        <div className="[&>button]:h-11 [&>button]:w-full [&>button]:justify-center [&>button]:px-2"><PosCashDrawerControl /></div>
        <a href="/admin/pos/bills" className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#e5d9cf] bg-white px-3 text-xs font-black text-[#122b3c]"><FontAwesomeIcon icon={faReceipt} className="text-[#C8102E]" />Bill history</a>
        <a href="/admin/pos/operations" className="col-span-2 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#173044] px-3 text-xs font-black text-white shadow-sm"><FontAwesomeIcon icon={faClock} className="text-[#E8A53A]" />Running orders · settle & print</a>
      </div>
      {queuedSales > 0 && <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-black text-amber-900">{queuedSales} sale{queuedSales === 1 ? "" : "s"} waiting to sync. Do not clear browser data or use private mode.</p>}
      {editingTicketNumber && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
          <div><p className="text-xs font-black uppercase tracking-[.16em] text-blue-700">Modifying running order</p><p className="text-sm font-black text-blue-950">{editingTicketNumber} · Add, remove or change items, then save and regenerate the KOT.</p></div>
          <button type="button" onClick={onCancelEditing} className="rounded-xl border border-blue-300 bg-white px-3 py-2 text-xs font-black text-blue-800">Cancel modification</button>
        </div>
      )}
    </header>
  );
}
