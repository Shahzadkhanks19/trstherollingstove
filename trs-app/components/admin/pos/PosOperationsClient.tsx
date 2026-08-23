"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { PosRunningOrderView, PosTableView } from "@/types/pos-operations";
import { flushPosMutationQueue, posMutation, queuedPosMutationCount } from "@/lib/pos/offline-queue";
import { readPosPrintSettings } from "@/lib/pos/print-settings";
import { buildInvoicePrintUrl } from "@/lib/pos/print-links";

type ApiResponse<T> = { success: boolean; message: string; data: T };
type OperationDialog = "transfer" | "merge" | "split" | "void" | "cancel-order" | "settle" | "create-table" | null;
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function PosOperationsClient({ canManage }: { canManage: boolean }) {
  const [tables, setTables] = useState<PosTableView[]>([]);
  const [orders, setOrders] = useState<PosRunningOrderView[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [operationDialog, setOperationDialog] = useState<OperationDialog>(null);
  const selected = useMemo(() => orders.find((order) => order.id === selectedId) ?? orders[0] ?? null, [orders, selectedId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tableResponse, orderResponse] = await Promise.all([
        fetch("/api/v1/pos/tables", { cache: "no-store" }),
        fetch("/api/v1/pos/running-orders", { cache: "no-store" }),
      ]);
      const tableJson = await tableResponse.json() as ApiResponse<PosTableView[]>;
      const orderJson = await orderResponse.json() as ApiResponse<PosRunningOrderView[]>;
      if (!tableResponse.ok) throw new Error(tableJson.message);
      if (!orderResponse.ok) throw new Error(orderJson.message);
      setTables(tableJson.data);
      setOrders(orderJson.data);
      setSelectedId((currentId) => currentId || orderJson.data[0]?.id || "");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load POS operations."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;

    const sync = async () => {
      const count = await flushPosMutationQueue();
      if (!active || !count) return;

      setMessage(`${count} offline POS action${count === 1 ? "" : "s"} synced.`);
      await load();
    };

    const initialLoadTimer = window.setTimeout(() => {
      if (!active) return;

      void load();
      const queuedCount = queuedPosMutationCount();
      if (queuedCount) {
        setMessage(`${queuedCount} POS action(s) waiting for connection.`);
      }
    }, 0);

    const refreshTimer = window.setInterval(() => {
      void load();
      void sync();
    }, 20000);

    window.addEventListener("online", sync);

    return () => {
      active = false;
      window.clearTimeout(initialLoadTimer);
      window.clearInterval(refreshTimer);
      window.removeEventListener("online", sync);
    };
  }, [load]);

  async function action(path: string, body: Record<string, unknown>, success: string) {
    setMessage("");
    try {
      const result = await posMutation(path, body);
      if (result.queued) { setMessage("Offline: action safely queued and will sync when connection returns."); return; }
      const response = result.response;
      if (!response) throw new Error("No response received.");
      const json = await response.json() as ApiResponse<unknown>;
      if (!response.ok) throw new Error(json.message);
      setMessage(success); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Action failed."); }
  }

  async function sendToKitchen() {
    if (!selected) return;
    const printSettings = readPosPrintSettings();
    const printWindow = window.open("", "_blank");
    try {
      const response = await fetch(`/api/v1/pos/running-orders/${selected.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ cart: selected.cart, guestCount: selected.guestCount, sendToKitchen: true }) });
      const json = await response.json() as ApiResponse<{ kotRevision: { revision: number } | null }>;
      if (!response.ok) throw new Error(json.message);
      const revision = json.data.kotRevision?.revision ?? selected.kitchenRevision;
      const query = new URLSearchParams({ paper: printSettings.kotPaper, copies: String(printSettings.kotCopies), customer: String(printSettings.showCustomerOnKot), prices: String(printSettings.showPricesOnKot) });
      if (revision > 0) query.set("revision", String(revision));
      if (printWindow) printWindow.location.href = `/api/v1/pos/running-orders/${selected.id}/kot?${query.toString()}`;
      setMessage(json.data.kotRevision ? `Revision KOT #${revision} printed.` : `Latest KOT #${revision} reprinted. No new kitchen changes detected.`);
      await load();
    } catch (error) {
      printWindow?.close();
      setMessage(error instanceof Error ? error.message : "Unable to print KOT.");
    }
  }

  async function transfer(tableId: string) {
    if (!selected) return;
    const table = tables.find((entry) => entry.id === tableId);
    if (!table) throw new Error("Select a valid available table.");
    await action(`/api/v1/pos/running-orders/${selected.id}/transfer`, { tableId: table.id }, `Transferred to ${table.name}.`);
  }

  async function merge(sourceOrderId: string) {
    if (!selected) return;
    await action(`/api/v1/pos/running-orders/${selected.id}/merge`, { sourceOrderId }, "Orders merged.");
  }

  async function split(raw: string) {
    if (!selected) return;
    const lineQuantities: Record<string, number> = {};
    for (const token of raw.split(",")) {
      const [indexText, quantityText] = token.trim().split(":");
      const line = selected.cart.lines[Number(indexText) - 1];
      const quantity = Number(quantityText);
      if (line && Number.isInteger(quantity) && quantity > 0) lineQuantities[line.lineId] = quantity;
    }
    if (!Object.keys(lineQuantities).length) throw new Error("Enter at least one valid line and quantity, for example 1:1.");
    await action(`/api/v1/pos/running-orders/${selected.id}/split`, { lineQuantities, targetTableId: null }, "Order split into a new running ticket.");
  }

  async function voidItem(lineId: string, quantity: number, reason: string) {
    if (!selected || !canManage) return;
    await action(`/api/v1/pos/running-orders/${selected.id}/void-item`, { lineId, quantity, reason }, "Item voided and audit event recorded.");
  }

  function duplicateSelectedOrder() {
    if (!selected) return;
    window.localStorage.setItem("trs-pos-rebill-order", JSON.stringify({ cart: selected.cart, orderNumber: selected.ticketNumber }));
    window.location.assign("/admin/pos");
  }

  function modifySelectedOrder() {
    if (!selected) return;
    window.localStorage.setItem(
      "trs-pos-edit-running-order",
      JSON.stringify({
        id: selected.id,
        ticketNumber: selected.ticketNumber,
        cart: selected.cart,
        guestCount: selected.guestCount,
      }),
    );
    window.location.assign("/admin/pos");
  }

  async function cancelSelectedOrder(reason: string) {
    if (!selected || !canManage) return;
    await action(
      `/api/v1/pos/running-orders/${selected.id}/cancel`,
      { reason },
      `${selected.ticketNumber} cancelled. Kitchen ticket cancelled and table released.`,
    );
    setSelectedId("");
  }

  async function settle(input: {
    paymentMethod: "cash" | "upi" | "split";
    paymentBreakdown: Array<{ method: "cash" | "upi"; amount: number; reference: string }>;
    amountTendered: number;
    upiReference: string;
    tipAmount: number;
    tipMethod: "none" | "cash" | "upi";
    tipCollection: "none" | "waiter_direct" | "restaurant";
    orderTakerName: string;
  }) {
    if (!selected) return;
    setMessage("Settling order...");
    const response = await fetch(`/api/v1/pos/running-orders/${selected.id}/settle`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
    const json = await response.json() as ApiResponse<{ invoice: { _id: string }; order: { orderNumber: string } }>;
    if (!response.ok) throw new Error(json.message);
    setMessage(`${json.data.order.orderNumber} settled.`);
    window.open(buildInvoicePrintUrl(json.data.invoice._id), "_blank", "noopener,noreferrer");
    setSelectedId(""); await load();
  }

  async function createTable(input: { name: string; code: string; section: string; capacity: number }) {
    if (!canManage) return;
    const response = await fetch("/api/v1/pos/tables", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...input, sortOrder: tables.length }) });
    const json = await response.json() as ApiResponse<unknown>;
    if (!response.ok) throw new Error(json.message);
    setMessage("Table created."); await load();
  }

  return <section className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs font-black uppercase tracking-[.2em] text-red-700">POS Phase 4</p><h1 className="text-3xl font-black text-slate-950">Tables & running orders</h1><p className="mt-1 text-sm text-slate-600">Live floor, transfers, merge, split, kitchen send, void and settlement.</p></div>
      <div className="flex gap-2"><Link href="/admin/pos" className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">New order</Link>{canManage && <button onClick={() => setOperationDialog("create-table")} className="rounded-xl bg-red-700 px-4 py-3 text-sm font-black text-white">Add table</button>}</div>
    </div>
    {message && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">{message}</p>}
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex justify-between"><h2 className="text-xl font-black">Live floor</h2><button onClick={() => void load()} className="text-xs font-black text-red-700">Refresh</button></div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-4">{tables.map((table) => <button key={table.id} onClick={() => table.runningOrderId && setSelectedId(table.runningOrderId)} className={`min-h-32 rounded-2xl border p-4 text-left ${table.status === "occupied" ? "border-red-300 bg-red-50" : table.status === "reserved" ? "border-amber-300 bg-amber-50" : table.status === "out_of_service" ? "border-slate-300 bg-slate-100 opacity-70" : "border-emerald-200 bg-emerald-50"}`}><div className="flex justify-between"><span className="font-black">{table.name}</span><span className="text-[10px] font-black uppercase">{table.status}</span></div><p className="mt-1 text-xs text-slate-500">{table.section} · {table.capacity} seats</p>{table.status === "occupied" && <div className="mt-5"><p className="text-lg font-black">{money.format(table.total)}</p><p className="text-xs font-bold text-slate-600">{table.guestCount} guests · {table.elapsedMinutes} min</p></div>}</button>)}</div>
        {!tables.length && !loading && <p className="py-16 text-center text-sm text-slate-500">No tables yet. Add tables or use takeaway running orders.</p>}
        <h2 className="mt-6 text-xl font-black">All running orders</h2>
        <div className="mt-3 grid gap-2">{orders.map((order) => <button key={order.id} onClick={() => setSelectedId(order.id)} className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left ${selected?.id === order.id ? "border-red-400 bg-red-50" : "border-slate-200"}`}><div><p className="font-black">{order.ticketNumber}</p><p className="text-xs text-slate-500">{order.tableName || "Takeaway"} · {order.guestCount} guests · {order.status.replaceAll("_", " ")}</p></div><p className="font-black">{money.format(order.totals.grandTotal)}</p></button>)}</div>
      </div>
      <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">{selected ? <><div className="flex justify-between"><div><p className="text-xs font-black uppercase text-red-700">{selected.status.replaceAll("_", " ")}</p><h2 className="text-2xl font-black">{selected.ticketNumber}</h2><p className="text-sm text-slate-500">{selected.tableName || "Takeaway"} · {selected.guestCount} guests</p></div><p className="text-xl font-black">{money.format(selected.totals.grandTotal)}</p></div><div className="mt-5 max-h-80 space-y-2 overflow-y-auto">{selected.cart.lines.map((line, index) => <div key={line.lineId} className="rounded-xl border border-slate-200 p-3"><div className="flex justify-between"><p className="font-black">{index + 1}. {line.name} ×{line.quantity}</p><p className="font-black">{money.format(line.unitPrice * line.quantity)}</p></div>{line.note && <p className="mt-1 text-xs text-slate-500">{line.note}</p>}</div>)}</div><div className="mt-5 grid grid-cols-2 gap-2"><button onClick={modifySelectedOrder} className="rounded-xl bg-blue-700 px-3 py-3 text-xs font-black text-white">Modify order</button><button onClick={duplicateSelectedOrder} className="rounded-xl bg-violet-700 px-3 py-3 text-xs font-black text-white">Duplicate to POS</button><button onClick={() => void sendToKitchen()} className="rounded-xl bg-amber-500 px-3 py-3 text-xs font-black">Reprint latest KOT</button><button onClick={() => setOperationDialog("transfer")} className="rounded-xl bg-slate-100 px-3 py-3 text-xs font-black">Move table</button><button onClick={() => setOperationDialog("merge")} disabled={orders.length < 2} className="rounded-xl bg-slate-100 px-3 py-3 text-xs font-black disabled:opacity-40">Merge orders</button><button onClick={() => setOperationDialog("split")} className="rounded-xl bg-slate-100 px-3 py-3 text-xs font-black">Split order</button>{canManage && <button onClick={() => setOperationDialog("void")} className="rounded-xl border border-red-300 px-3 py-3 text-xs font-black text-red-700">Void item</button>}{canManage && <button onClick={() => setOperationDialog("cancel-order")} className="rounded-xl bg-red-700 px-3 py-3 text-xs font-black text-white">Cancel order</button>}<button onClick={() => setOperationDialog("settle")} className="rounded-xl bg-emerald-700 px-3 py-3 text-xs font-black text-white">Settle & print invoice</button></div></> : <div className="grid min-h-96 place-items-center text-center text-sm text-slate-500">Select a running order.</div>}</aside>
    </div>
    <PosOperationsModal
      key={`${operationDialog ?? "closed"}-${selected?.id ?? "none"}`}
      type={operationDialog}
      selected={selected}
      tables={tables}
      orders={orders}
      onClose={() => setOperationDialog(null)}
      onTransfer={transfer}
      onMerge={merge}
      onSplit={split}
      onVoid={voidItem}
      onCancelOrder={cancelSelectedOrder}
      onSettle={settle}
      onCreateTable={createTable}
    />
  </section>;
}

function PosOperationsModal({ type, selected, tables, orders, onClose, onTransfer, onMerge, onSplit, onVoid, onCancelOrder, onSettle, onCreateTable }: {
  type: OperationDialog; selected: PosRunningOrderView | null; tables: PosTableView[]; orders: PosRunningOrderView[]; onClose: () => void;
  onTransfer: (tableId: string) => Promise<void>; onMerge: (sourceId: string) => Promise<void>; onSplit: (raw: string) => Promise<void>;
  onVoid: (lineId: string, quantity: number, reason: string) => Promise<void>; onCancelOrder: (reason: string) => Promise<void>; onSettle: (input: {
    paymentMethod: "cash" | "upi" | "split";
    paymentBreakdown: Array<{ method: "cash" | "upi"; amount: number; reference: string }>;
    amountTendered: number;
    upiReference: string;
    tipAmount: number;
    tipMethod: "none" | "cash" | "upi";
    tipCollection: "none" | "waiter_direct" | "restaurant";
    orderTakerName: string;
  }) => Promise<void>;
  onCreateTable: (input: { name: string; code: string; section: string; capacity: number }) => Promise<void>;
}) {
  const [choice, setChoice] = useState(""); const [text, setText] = useState(""); const [quantity, setQuantity] = useState(1);
  const [method, setMethod] = useState<"cash" | "upi" | "split">("cash"); const [amount, setAmount] = useState(selected?.totals.grandTotal ?? 0);
  const [splitCash, setSplitCash] = useState(""); const [splitUpi, setSplitUpi] = useState("");
  const [reference, setReference] = useState("");
  const [tipAmount, setTipAmount] = useState(0);
  const [tipMethod, setTipMethod] = useState<"none" | "cash" | "upi">("none");
  const [tipCollection, setTipCollection] = useState<"none" | "waiter_direct" | "restaurant">("none");
  const [orderTakerName, setOrderTakerName] = useState("");
  const [name, setName] = useState(""); const [code, setCode] = useState("");
  const [section, setSection] = useState("Main"); const [capacity, setCapacity] = useState(4); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  if (!type) return null;
  const title = type === "transfer" ? "Move running order" : type === "merge" ? "Merge running orders" : type === "split" ? "Split running order" : type === "void" ? "Void order item" : type === "cancel-order" ? "Cancel running order" : type === "settle" ? "Settle and print invoice" : "Add POS table";
  async function submit() {
    setBusy(true); setError("");
    try {
      if (type === "transfer") await onTransfer(choice);
      if (type === "merge") await onMerge(choice);
      if (type === "split") await onSplit(text);
      if (type === "void") { if (!text.trim()) throw new Error("Enter the manager reason."); await onVoid(choice, quantity, text.trim()); }
      if (type === "cancel-order") { if (text.trim().length < 3) throw new Error("Enter a cancellation reason."); await onCancelOrder(text.trim()); }
      if (type === "settle") {
        if (tipAmount > 0 && tipMethod === "none") throw new Error("Select how the waiter tip was received.");
        if (tipAmount > 0 && tipCollection === "none") throw new Error("Select who currently holds the tip.");
        if (tipMethod === "upi" && tipCollection !== "restaurant") throw new Error("UPI tips are received by the restaurant.");
        if (tipAmount > 0 && !orderTakerName.trim()) throw new Error("Enter the waiter or order taker name.");
        const totalDue = (selected?.totals.grandTotal ?? 0) + (tipCollection === "restaurant" ? tipAmount : 0);
        const splitCashAmount = Number(splitCash || 0);
        const splitUpiAmount = Number(splitUpi || 0);
        if (method === "split" && (splitCashAmount <= 0 || splitUpiAmount <= 0)) throw new Error("Enter positive cash and UPI amounts.");
        if (method === "split" && Math.abs(splitCashAmount + splitUpiAmount - totalDue) > 0.01) throw new Error("Cash and UPI must exactly equal the restaurant collection amount.");
        if (method === "cash" && amount < totalDue) throw new Error("Cash received is less than the restaurant collection amount.");
        if (tipMethod === "upi" && method === "cash") throw new Error("Select UPI or split payment for an online waiter tip.");
        await onSettle({
          paymentMethod: method,
          paymentBreakdown: method === "split" ? [
            { method: "cash", amount: splitCashAmount, reference: "" },
            { method: "upi", amount: splitUpiAmount, reference },
          ] : [],
          amountTendered: method === "cash" ? amount : method === "split" ? splitCashAmount : totalDue,
          upiReference: reference,
          tipAmount,
          tipMethod,
          tipCollection,
          orderTakerName: orderTakerName.trim(),
        });
      }
      if (type === "create-table") { if (name.trim().length < 1 || code.trim().length < 1) throw new Error("Table name and code are required."); await onCreateTable({ name: name.trim(), code: code.trim(), section: section.trim() || "Main", capacity }); }
      onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Action failed."); } finally { setBusy(false); }
  }
  const available = tables.filter((table)=>table.status === "available" || table.status === "reserved");
  const mergeOrders = orders.filter((order)=>order.id !== selected?.id);
  return <div className="fixed inset-0 z-[180] grid place-items-end bg-black/55 p-0 backdrop-blur-sm sm:place-items-center sm:p-5"><button className="absolute inset-0" onClick={onClose} aria-label="Close dialog"/><section role="dialog" aria-modal="true" className="relative z-10 w-full rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl"><h2 className="text-xl font-black">{title}</h2><div className="mt-4 space-y-3">
    {type === "transfer" && <select value={choice} onChange={(e)=>setChoice(e.currentTarget.value)} className="h-11 w-full rounded-xl border px-3"><option value="">Select table</option>{available.map((table)=><option key={table.id} value={table.id}>{table.name}</option>)}</select>}
    {type === "merge" && <select value={choice} onChange={(e)=>setChoice(e.currentTarget.value)} className="h-11 w-full rounded-xl border px-3"><option value="">Select order</option>{mergeOrders.map((order)=><option key={order.id} value={order.id}>{order.ticketNumber} · {order.tableName || "Takeaway"}</option>)}</select>}
    {type === "split" && <><p className="text-xs text-slate-500">Use line:quantity pairs, for example 1:1,2:2.</p><input value={text} onChange={(e)=>setText(e.currentTarget.value)} className="h-11 w-full rounded-xl border px-3" placeholder="1:1"/></>}
    {type === "void" && <><select value={choice} onChange={(e)=>setChoice(e.currentTarget.value)} className="h-11 w-full rounded-xl border px-3"><option value="">Select item</option>{selected?.cart.lines.map((line)=><option key={line.lineId} value={line.lineId}>{line.name} ×{line.quantity}</option>)}</select><input type="number" min={1} value={quantity} onChange={(e)=>setQuantity(Math.max(1,Number(e.currentTarget.value)||1))} className="h-11 w-full rounded-xl border px-3"/><textarea value={text} onChange={(e)=>setText(e.currentTarget.value)} className="w-full rounded-xl border p-3" placeholder="Manager reason"/> </>}
    {type === "cancel-order" && <><p className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-800">This cancels the entire running order, cancels its kitchen ticket, and releases the table. A reason is mandatory.</p><textarea value={text} onChange={(e)=>setText(e.currentTarget.value)} className="min-h-28 w-full rounded-xl border border-red-200 p-3" placeholder="Cancellation reason"/></>}
    {type === "settle" && <>
      <div className="grid grid-cols-3 gap-2"><button type="button" onClick={()=>{setMethod("cash");setAmount((selected?.totals.grandTotal ?? 0) + (tipCollection === "restaurant" ? tipAmount : 0));}} className={`h-11 rounded-xl border font-black ${method==="cash"?"border-emerald-600 bg-emerald-50":""}`}>Cash</button><button type="button" onClick={()=>setMethod("upi")} className={`h-11 rounded-xl border font-black ${method==="upi"?"border-violet-600 bg-violet-50":""}`}>UPI</button><button type="button" onClick={()=>setMethod("split")} className={`h-11 rounded-xl border font-black ${method==="split"?"border-blue-600 bg-blue-50":""}`}>Split</button></div>
      {method === "cash" ? <input type="number" min={selected?.totals.grandTotal ?? 0} value={amount} onChange={(e)=>setAmount(Number(e.currentTarget.value)||0)} className="h-11 w-full rounded-xl border px-3" placeholder="Cash received"/> : method === "upi" ? <input value={reference} onChange={(e)=>setReference(e.currentTarget.value)} className="h-11 w-full rounded-xl border px-3" placeholder="UPI reference (optional)"/> : <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-black text-slate-700">Cash part<input type="number" min="0" value={splitCash} onChange={(e)=>setSplitCash(e.currentTarget.value)} className="mt-1 h-11 w-full rounded-xl border px-3" placeholder="0"/></label><label className="text-xs font-black text-slate-700">UPI / online part<input type="number" min="0" value={splitUpi} onChange={(e)=>setSplitUpi(e.currentTarget.value)} className="mt-1 h-11 w-full rounded-xl border px-3" placeholder="0"/></label><label className="text-xs font-black text-slate-700 sm:col-span-2">UPI reference<input value={reference} onChange={(e)=>setReference(e.currentTarget.value)} className="mt-1 h-11 w-full rounded-xl border px-3" placeholder="Optional transaction reference"/></label><p className="text-xs font-bold text-slate-500 sm:col-span-2">Cash + UPI must equal {money.format((selected?.totals.grandTotal ?? 0) + (tipCollection === "restaurant" ? tipAmount : 0))}.</p></div>}
      <div className="grid gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 sm:grid-cols-2">
        <label className="text-xs font-black text-slate-700">Order taker / waiter<input value={orderTakerName} onChange={(e)=>setOrderTakerName(e.currentTarget.value)} className="mt-1 h-11 w-full rounded-xl border border-amber-200 bg-white px-3" placeholder="Waiter name"/></label>
        <label className="text-xs font-black text-slate-700">Tip amount<input type="number" min="0" value={tipAmount} onChange={(e)=>setTipAmount(Math.max(0, Number(e.currentTarget.value)||0))} className="mt-1 h-11 w-full rounded-xl border border-amber-200 bg-white px-3"/></label>
        <label className="text-xs font-black text-slate-700 sm:col-span-2">Tip received through<select value={tipMethod} onChange={(e)=>{const value=e.currentTarget.value as "none"|"cash"|"upi";setTipMethod(value);setTipCollection(value==="upi"?"restaurant":value==="none"?"none":tipCollection);}} className="mt-1 h-11 w-full rounded-xl border border-amber-200 bg-white px-3"><option value="none">No tip</option><option value="cash">Cash</option><option value="upi">UPI — restaurant QR</option></select></label><label className="text-xs font-black text-slate-700 sm:col-span-2">Who holds the tip now?<select value={tipCollection} onChange={(e)=>setTipCollection(e.currentTarget.value as "none"|"waiter_direct"|"restaurant")} disabled={tipMethod==="upi"} className="mt-1 h-11 w-full rounded-xl border border-amber-200 bg-white px-3"><option value="none">Select</option>{tipMethod==="cash"&&<option value="waiter_direct">Waiter collected it directly</option>}<option value="restaurant">Restaurant collected it — payable later</option></select></label>
        {tipAmount > 0 && <p className="text-xs font-bold text-amber-900 sm:col-span-2">{tipCollection === "restaurant" ? `Restaurant will receive ${money.format((selected?.totals.grandTotal ?? 0) + tipAmount)}. ${money.format(tipAmount)} is payable to ${orderTakerName.trim() || "the waiter"}.` : `Cash tip is held directly by ${orderTakerName.trim() || "the waiter"} and is not added to the restaurant collection.`}</p>}
      </div>
    </>}
    {type === "create-table" && <><input value={name} onChange={(e)=>setName(e.currentTarget.value)} className="h-11 w-full rounded-xl border px-3" placeholder="Table name"/><input value={code} onChange={(e)=>setCode(e.currentTarget.value.toUpperCase().replace(/[^A-Z0-9_-]/g,""))} className="h-11 w-full rounded-xl border px-3" placeholder="Unique code"/><input value={section} onChange={(e)=>setSection(e.currentTarget.value)} className="h-11 w-full rounded-xl border px-3" placeholder="Section"/><input type="number" min={1} max={50} value={capacity} onChange={(e)=>setCapacity(Math.max(1,Number(e.currentTarget.value)||1))} className="h-11 w-full rounded-xl border px-3"/></>}
    {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</p>}
  </div><div className="mt-5 grid grid-cols-2 gap-2"><button onClick={onClose} className="h-11 rounded-xl border font-black">Cancel</button><button disabled={busy} onClick={()=>void submit()} className="h-11 rounded-xl bg-slate-950 font-black text-white disabled:opacity-50">{busy?"Please wait…":"Confirm"}</button></div></section></div>;
}
