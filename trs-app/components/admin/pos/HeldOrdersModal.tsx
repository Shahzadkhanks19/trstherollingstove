"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFolderOpen, faPause, faTrash, faXmark } from "@fortawesome/free-solid-svg-icons";
import type { PosCartState } from "@/types/pos";

export type HeldOrder = {
  id: string;
  title: string;
  cart: PosCartState;
  itemCount: number;
  grandTotal: number;
  createdAt: string;
  updatedAt: string;
};

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function HeldOrdersModal({
  open,
  loading,
  orders,
  hasCurrentCart,
  onClose,
  onRecall,
  onDelete,
}: {
  open: boolean;
  loading: boolean;
  orders: HeldOrder[];
  hasCurrentCart: boolean;
  onClose: () => void;
  onRecall: (order: HeldOrder) => void;
  onDelete: (order: HeldOrder) => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[130] grid place-items-center bg-black/55 p-4 backdrop-blur-sm">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close held orders" />
      <section className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[28px] bg-[#fffdf9] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[#eadfd6] px-5 py-4">
          <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#C8102E]">Saved at counter</p><h2 className="text-xl font-black text-[#122b3c]">Held orders</h2></div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl bg-[#f3ece5]"><FontAwesomeIcon icon={faXmark} /></button>
        </header>
        <div className="max-h-[65vh] overflow-y-auto p-5">
          {loading ? <p className="py-12 text-center text-sm font-bold text-[#8b7e75]">Loading held orders...</p> : orders.length ? (
            <div className="space-y-3">{orders.map((order) => (
              <article key={order.id} className="flex items-center gap-3 rounded-2xl border border-[#e5d9cf] bg-white p-4">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#f3ece5] text-[#C8102E]"><FontAwesomeIcon icon={faPause} /></span>
                <div className="min-w-0 flex-1"><h3 className="truncate text-sm font-black text-[#122b3c]">{order.title}</h3><p className="mt-1 text-[10px] font-bold text-[#8b7e75]">{order.itemCount} items · {money.format(order.grandTotal)} · {new Date(order.updatedAt).toLocaleString()}</p></div>
                <button type="button" onClick={() => onRecall(order)} className="rounded-xl bg-[#111820] px-3 py-2 text-xs font-black text-white">{hasCurrentCart ? "Replace" : "Recall"}</button>
                <button type="button" onClick={() => onDelete(order)} className="grid h-9 w-9 place-items-center rounded-xl bg-red-50 text-[#C8102E]" aria-label={`Delete ${order.title}`}><FontAwesomeIcon icon={faTrash} /></button>
              </article>
            ))}</div>
          ) : <div className="py-12 text-center"><FontAwesomeIcon icon={faFolderOpen} className="text-3xl text-[#c7b8ad]" /><p className="mt-3 text-sm font-black text-[#122b3c]">No held orders</p></div>}
        </div>
      </section>
    </div>
  );
}
