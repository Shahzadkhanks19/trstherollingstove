"use client";

import type { PosRunningOrderView, PosTableView } from "@/types/pos-operations";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

type PosOperationsWorkspaceProps = {
  tables: PosTableView[];
  orders: PosRunningOrderView[];
  selected: PosRunningOrderView | null;
  loading: boolean;
  canManage: boolean;
  onRefresh: () => void;
  onSelectOrder: (orderId: string) => void;
  onModify: () => void;
  onDuplicate: () => void;
  onSendToKitchen: () => void;
  onOpenTransfer: () => void;
  onOpenMerge: () => void;
  onOpenSplit: () => void;
  onOpenVoid: () => void;
  onOpenCancel: () => void;
  onOpenSettle: () => void;
};

export function PosOperationsWorkspace({
  tables,
  orders,
  selected,
  loading,
  canManage,
  onRefresh,
  onSelectOrder,
  onModify,
  onDuplicate,
  onSendToKitchen,
  onOpenTransfer,
  onOpenMerge,
  onOpenSplit,
  onOpenVoid,
  onOpenCancel,
  onOpenSettle,
}: PosOperationsWorkspaceProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex justify-between">
          <h2 className="text-xl font-black">Live floor</h2>
          <button
            onClick={onRefresh}
            className="text-xs font-black text-red-700"
          >
            Refresh
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-4">
          {tables.map((table) => (
            <button
              key={table.id}
              onClick={() =>
                table.runningOrderId && onSelectOrder(table.runningOrderId)
              }
              className={`min-h-32 rounded-2xl border p-4 text-left ${table.status === "occupied" ? "border-red-300 bg-red-50" : table.status === "reserved" ? "border-amber-300 bg-amber-50" : table.status === "out_of_service" ? "border-slate-300 bg-slate-100 opacity-70" : "border-emerald-200 bg-emerald-50"}`}
            >
              <div className="flex justify-between">
                <span className="font-black">{table.name}</span>
                <span className="text-[10px] font-black uppercase">
                  {table.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {table.section} · {table.capacity} seats
              </p>
              {table.status === "occupied" && (
                <div className="mt-5">
                  <p className="text-lg font-black">{money.format(table.total)}</p>
                  <p className="text-xs font-bold text-slate-600">
                    {table.guestCount} guests · {table.elapsedMinutes} min
                  </p>
                </div>
              )}
            </button>
          ))}
        </div>
        {!tables.length && !loading && (
          <p className="py-16 text-center text-sm text-slate-500">
            No tables yet. Add tables or use takeaway running orders.
          </p>
        )}
        <h2 className="mt-6 text-xl font-black">All running orders</h2>
        <div className="mt-3 grid gap-2">
          {orders.map((order) => (
            <button
              key={order.id}
              onClick={() => onSelectOrder(order.id)}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left ${selected?.id === order.id ? "border-red-400 bg-red-50" : "border-slate-200"}`}
            >
              <div>
                <p className="font-black">{order.ticketNumber}</p>
                <p className="text-xs text-slate-500">
                  {order.tableName || "Takeaway"} · {order.guestCount} guests ·{" "}
                  {order.status.replaceAll("_", " ")}
                </p>
              </div>
              <p className="font-black">{money.format(order.totals.grandTotal)}</p>
            </button>
          ))}
        </div>
      </div>

      <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        {selected ? (
          <>
            <div className="flex justify-between">
              <div>
                <p className="text-xs font-black uppercase text-red-700">
                  {selected.status.replaceAll("_", " ")}
                </p>
                <h2 className="text-2xl font-black">{selected.ticketNumber}</h2>
                <p className="text-sm text-slate-500">
                  {selected.tableName || "Takeaway"} · {selected.guestCount} guests
                </p>
              </div>
              <p className="text-xl font-black">
                {money.format(selected.totals.grandTotal)}
              </p>
            </div>
            <div className="mt-5 max-h-80 space-y-2 overflow-y-auto">
              {selected.cart.lines.map((line, index) => (
                <div
                  key={line.lineId}
                  className="rounded-xl border border-slate-200 p-3"
                >
                  <div className="flex justify-between">
                    <p className="font-black">
                      {index + 1}. {line.name} ×{line.quantity}
                    </p>
                    <p className="font-black">
                      {money.format(line.unitPrice * line.quantity)}
                    </p>
                  </div>
                  {line.note && (
                    <p className="mt-1 text-xs text-slate-500">{line.note}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button onClick={onModify} className="rounded-xl bg-blue-700 px-3 py-3 text-xs font-black text-white">
                Modify order
              </button>
              <button onClick={onDuplicate} className="rounded-xl bg-violet-700 px-3 py-3 text-xs font-black text-white">
                Duplicate to POS
              </button>
              <button onClick={onSendToKitchen} className="rounded-xl bg-amber-500 px-3 py-3 text-xs font-black">
                Reprint latest KOT
              </button>
              <button onClick={onOpenTransfer} className="rounded-xl bg-slate-100 px-3 py-3 text-xs font-black">
                Move table
              </button>
              <button onClick={onOpenMerge} disabled={orders.length < 2} className="rounded-xl bg-slate-100 px-3 py-3 text-xs font-black disabled:opacity-40">
                Merge orders
              </button>
              <button onClick={onOpenSplit} className="rounded-xl bg-slate-100 px-3 py-3 text-xs font-black">
                Split order
              </button>
              {canManage && (
                <button onClick={onOpenVoid} className="rounded-xl border border-red-300 px-3 py-3 text-xs font-black text-red-700">
                  Void item
                </button>
              )}
              {canManage && (
                <button onClick={onOpenCancel} className="rounded-xl bg-red-700 px-3 py-3 text-xs font-black text-white">
                  Cancel order
                </button>
              )}
              <button onClick={onOpenSettle} className="rounded-xl bg-emerald-700 px-3 py-3 text-xs font-black text-white">
                Settle & print invoice
              </button>
            </div>
          </>
        ) : (
          <div className="grid min-h-96 place-items-center text-center text-sm text-slate-500">
            Select a running order.
          </div>
        )}
      </aside>
    </div>
  );
}
