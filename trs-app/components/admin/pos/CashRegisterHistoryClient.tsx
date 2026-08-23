"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDown, faArrowUp, faDownload, faEye, faFilter, faPrint, faRotate, faXmark } from "@fortawesome/free-solid-svg-icons";

type Person = { _id?: string; name?: string; email?: string };
type Register = { _id?: string; name?: string; code?: string; locationLabel?: string };
type MovementType = "cash_in" | "cash_out" | "cash_sale" | "cash_refund";
type Movement = { _id: string; type: MovementType; amount: number; reason?: string; referenceType?: string; createdAt: string; createdBy?: Person | string; runningBalance: number };
type Shift = { _id: string; status: "open" | "closed"; openingCash: number; expectedCash: number; countedCash?: number | null; cashDifference?: number | null; openedAt: string; closedAt?: string | null; closingNote?: string; registerId?: Register | string; openedBy?: Person | string; closedBy?: Person | string; movements: Movement[]; movementSummary: { openingCash: number; cashIn: number; cashOut: number; cashSales: number; cashRefunds: number; manualNet: number; calculatedExpectedCash: number } };
type Summary = { registers: number; open: number; closed: number; openingCash: number; cashIn: number; cashOut: number; cashSales: number; cashRefunds: number; expectedCash: number; countedCash: number; difference: number };
type ApiResponse<T> = { success: boolean; message: string; data: T };

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const dateTime = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const daysAgo = (days: number) => { const date = new Date(`${today()}T00:00:00+05:30`); date.setUTCDate(date.getUTCDate() - days); return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(date); };
function personName(value?: Person | string) { return typeof value === "object" && value ? value.name || value.email || "TRS staff" : "TRS staff"; }
function registerName(value?: Register | string) { return typeof value === "object" && value ? `${value.name || "Register"}${value.code ? ` (${value.code})` : ""}` : "Register"; }
function movementName(type: MovementType) { if (type === "cash_in") return "Cash added"; if (type === "cash_out") return "Cash taken out"; if (type === "cash_sale") return "Cash sale"; return "Cash refund"; }
function positive(type: MovementType) { return type === "cash_in" || type === "cash_sale"; }

export function CashRegisterHistoryClient() {
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(today());
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Shift[]>([]);
  const [summary, setSummary] = useState<Summary>({ registers: 0, open: 0, closed: 0, openingCash: 0, cashIn: 0, cashOut: 0, cashSales: 0, cashRefunds: 0, expectedCash: 0, countedCash: 0, difference: 0 });
  const [selected, setSelected] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const query = new URLSearchParams({ from, to, limit: "500" });
      if (status !== "all") query.set("status", status);
      if (search.trim()) query.set("search", search.trim());
      const response = await fetch(`/api/v1/pos/shifts/history/all?${query}`, { cache: "no-store", credentials: "include" });
      const json = await response.json() as ApiResponse<{ rows: Shift[]; summary: Summary }>;
      if (!response.ok) throw new Error(json.message || "Unable to load register history.");
      setRows(json.data.rows); setSummary(json.data.summary);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load register history."); }
    finally { setLoading(false); }
  }, [from, search, status, to]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [load]);

  const cards = useMemo(() => [
    ["Registers", String(summary.registers), `${summary.open} open · ${summary.closed} closed`],
    ["Opening cash", money.format(summary.openingCash), "Across selected shifts"],
    ["Cash added / out", `${money.format(summary.cashIn)} / ${money.format(summary.cashOut)}`, "Manual drawer movements"],
    ["Cash sales", money.format(summary.cashSales), `Refunds ${money.format(summary.cashRefunds)}`],
    ["Difference", money.format(summary.difference), "Counted minus expected"],
  ], [summary]);

  function preset(days: number) { setFrom(daysAgo(days - 1)); setTo(today()); }
  function exportCsv() {
    const header = ["Date", "Register", "Cashier", "Status", "Opening", "Cash In", "Cash Out", "Cash Sales", "Refunds", "Expected", "Counted", "Difference", "Closing Note"];
    const lines = rows.map((shift) => [shift.openedAt, registerName(shift.registerId), personName(shift.openedBy), shift.status, shift.openingCash, shift.movementSummary.cashIn, shift.movementSummary.cashOut, shift.movementSummary.cashSales, shift.movementSummary.cashRefunds, shift.expectedCash, shift.countedCash ?? "", shift.cashDifference ?? "", shift.closingNote ?? ""].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `trs-cash-registers-${from}-to-${to}.csv`; anchor.click(); URL.revokeObjectURL(url);
  }

  return <div className="space-y-6 p-4 sm:p-6 lg:p-10">
    <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div><p className="text-xs font-black uppercase tracking-[.22em] text-[#C8102E]">POS audit and reconciliation</p><h1 className="mt-2 text-3xl font-black text-[#173044] sm:text-4xl">Cash Registers</h1><p className="mt-2 max-w-3xl text-sm text-[#6d625a] sm:text-base">Review any previous day, every cash movement, its reason, staff member, running drawer balance and closing difference.</p></div>
      <div className="flex flex-wrap gap-2"><button onClick={exportCsv} disabled={!rows.length} className="flex h-11 items-center gap-2 rounded-xl border border-[#d9ccc2] bg-white px-4 text-sm font-black text-[#173044] disabled:opacity-50"><FontAwesomeIcon icon={faDownload}/>Export CSV</button><button onClick={() => window.print()} className="flex h-11 items-center gap-2 rounded-xl bg-[#173044] px-4 text-sm font-black text-white"><FontAwesomeIcon icon={faPrint}/>Print</button></div>
    </header>

    <section className="rounded-3xl border border-[#e5d9cf] bg-white p-4 shadow-sm sm:p-5 print:hidden">
      <div className="mb-4 flex flex-wrap gap-2"><button onClick={() => preset(1)} className="rounded-xl bg-[#f4eee8] px-3 py-2 text-xs font-black">Today</button><button onClick={() => { setFrom(daysAgo(1)); setTo(daysAgo(1)); }} className="rounded-xl bg-[#f4eee8] px-3 py-2 text-xs font-black">Yesterday</button><button onClick={() => preset(7)} className="rounded-xl bg-[#f4eee8] px-3 py-2 text-xs font-black">Last 7 days</button><button onClick={() => preset(30)} className="rounded-xl bg-[#f4eee8] px-3 py-2 text-xs font-black">Last 30 days</button></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_180px_1.5fr_auto]">
        <label className="text-xs font-black text-[#756960]">From<input type="date" value={from} onChange={(e)=>setFrom(e.currentTarget.value)} className="mt-1 h-11 w-full rounded-xl border border-[#d9ccc2] px-3"/></label>
        <label className="text-xs font-black text-[#756960]">To<input type="date" value={to} onChange={(e)=>setTo(e.currentTarget.value)} className="mt-1 h-11 w-full rounded-xl border border-[#d9ccc2] px-3"/></label>
        <label className="text-xs font-black text-[#756960]">Status<select value={status} onChange={(e)=>setStatus(e.currentTarget.value)} className="mt-1 h-11 w-full rounded-xl border border-[#d9ccc2] px-3"><option value="all">All</option><option value="open">Open</option><option value="closed">Closed</option></select></label>
        <label className="text-xs font-black text-[#756960]">Search<input value={search} onChange={(e)=>setSearch(e.currentTarget.value)} placeholder="Cashier, register, reason..." className="mt-1 h-11 w-full rounded-xl border border-[#d9ccc2] px-3"/></label>
        <button onClick={() => void load()} className="mt-auto flex h-11 items-center justify-center gap-2 rounded-xl bg-[#C8102E] px-4 text-sm font-black text-white"><FontAwesomeIcon icon={faFilter}/>Apply</button>
      </div>
    </section>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{cards.map(([label,value,sub])=><article key={label} className="rounded-2xl border border-[#e5d9cf] bg-white p-4"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#8b7e75]">{label}</p><p className="mt-2 break-words text-xl font-black text-[#173044]">{value}</p><p className="mt-1 text-xs text-[#8b7e75]">{sub}</p></article>)}</section>

    {error ? <p className="rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</p> : null}
    <section className="overflow-hidden rounded-3xl border border-[#d9ccc2] bg-white">
      <div className="overflow-x-auto"><table className="min-w-[1050px] w-full text-left"><thead className="bg-[#173044] text-white"><tr>{["Date / register","Cashier","Status","Opening","Cash in","Cash out","Cash sales","Expected","Counted","Difference",""].map((h)=><th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-wider">{h}</th>)}</tr></thead><tbody>{rows.map((shift)=><tr key={shift._id} className="border-b border-[#eee4db] last:border-0"><td className="px-4 py-4"><p className="font-black text-[#173044]">{registerName(shift.registerId)}</p><p className="mt-1 text-xs text-[#8b7e75]">{dateTime.format(new Date(shift.openedAt))}</p></td><td className="px-4 py-4 text-sm font-bold">{personName(shift.openedBy)}</td><td className="px-4 py-4"><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${shift.status === "open" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{shift.status}</span></td><td className="px-4 py-4 font-bold">{money.format(shift.openingCash)}</td><td className="px-4 py-4 font-bold text-emerald-700">{money.format(shift.movementSummary.cashIn)}</td><td className="px-4 py-4 font-bold text-amber-700">{money.format(shift.movementSummary.cashOut)}</td><td className="px-4 py-4 font-bold">{money.format(shift.movementSummary.cashSales)}</td><td className="px-4 py-4 font-black">{money.format(shift.expectedCash)}</td><td className="px-4 py-4 font-bold">{shift.status === "closed" ? money.format(shift.countedCash ?? 0) : "—"}</td><td className={`px-4 py-4 font-black ${(shift.cashDifference ?? 0) === 0 ? "text-emerald-700" : "text-red-700"}`}>{shift.status === "closed" ? money.format(shift.cashDifference ?? 0) : "—"}</td><td className="px-4 py-4"><button onClick={()=>setSelected(shift)} className="flex items-center gap-2 rounded-xl border border-[#d9ccc2] px-3 py-2 text-xs font-black"><FontAwesomeIcon icon={faEye}/>View</button></td></tr>)}{!rows.length&&!loading?<tr><td colSpan={11} className="px-4 py-16 text-center font-bold text-[#8b7e75]">No register shifts found for this period.</td></tr>:null}</tbody></table></div>
      {loading ? <p className="p-8 text-center font-bold text-[#8b7e75]"><FontAwesomeIcon icon={faRotate} spin className="mr-2"/>Loading register history...</p> : null}
    </section>

    {selected ? <div className="fixed inset-0 z-[120] grid place-items-center bg-black/55 p-3 print:static print:bg-white print:p-0"><section className="flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-[#faf7f3] shadow-2xl print:max-h-none print:max-w-none print:rounded-none print:shadow-none"><header className="flex items-start justify-between border-b border-[#e5d9cf] bg-white p-5"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#C8102E]">Cash register audit</p><h2 className="mt-1 text-2xl font-black text-[#173044]">{registerName(selected.registerId)}</h2><p className="mt-1 text-xs text-[#8b7e75]">Opened {dateTime.format(new Date(selected.openedAt))}{selected.closedAt ? ` · Closed ${dateTime.format(new Date(selected.closedAt))}` : ""}</p></div><button onClick={()=>setSelected(null)} className="grid h-11 w-11 place-items-center rounded-xl bg-[#f3ece5] print:hidden"><FontAwesomeIcon icon={faXmark}/></button></header><div className="overflow-y-auto p-4 sm:p-6">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><div className="rounded-xl bg-white p-3"><p className="text-[9px] font-black uppercase text-[#8b7e75]">Opening</p><p className="font-black">{money.format(selected.openingCash)}</p></div><div className="rounded-xl bg-emerald-50 p-3"><p className="text-[9px] font-black uppercase text-emerald-700">Cash added</p><p className="font-black">{money.format(selected.movementSummary.cashIn)}</p></div><div className="rounded-xl bg-amber-50 p-3"><p className="text-[9px] font-black uppercase text-amber-700">Cash out</p><p className="font-black">{money.format(selected.movementSummary.cashOut)}</p></div><div className="rounded-xl bg-[#173044] p-3 text-white"><p className="text-[9px] font-black uppercase text-white/60">Expected</p><p className="font-black">{money.format(selected.expectedCash)}</p></div></div>
      <div className="mt-5 space-y-2"><article className="grid grid-cols-[1fr_auto] gap-3 rounded-xl border border-[#e5d9cf] bg-white p-3"><div><p className="text-sm font-black">Opening cash</p><p className="text-xs text-[#8b7e75]">{personName(selected.openedBy)} · {dateTime.format(new Date(selected.openedAt))}</p></div><div className="text-right"><p className="font-black text-emerald-700">+{money.format(selected.openingCash)}</p><p className="text-[10px] text-[#8b7e75]">Balance {money.format(selected.openingCash)}</p></div></article>{selected.movements.map((movement)=><article key={movement._id} className="grid grid-cols-[auto_1fr_auto] gap-3 rounded-xl border border-[#e5d9cf] bg-white p-3"><span className={`grid h-9 w-9 place-items-center rounded-lg ${positive(movement.type)?"bg-emerald-50 text-emerald-700":"bg-amber-50 text-amber-700"}`}><FontAwesomeIcon icon={positive(movement.type)?faArrowUp:faArrowDown}/></span><div className="min-w-0"><p className="text-sm font-black">{movementName(movement.type)}</p><p className="break-words text-xs text-[#756960]">{movement.reason || "No reason recorded"}</p><p className="mt-1 text-[10px] text-[#9a8c82]">{dateTime.format(new Date(movement.createdAt))} · {personName(movement.createdBy)}</p></div><div className="text-right"><p className={`font-black ${positive(movement.type)?"text-emerald-700":"text-amber-700"}`}>{positive(movement.type)?"+":"−"}{money.format(movement.amount)}</p><p className="text-[10px] text-[#8b7e75]">Balance {money.format(movement.runningBalance)}</p></div></article>)}</div>
      {selected.status === "closed" ? <div className="mt-5 grid gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 sm:grid-cols-3"><div><p className="text-[10px] font-black uppercase text-red-700">Expected</p><p className="text-lg font-black">{money.format(selected.expectedCash)}</p></div><div><p className="text-[10px] font-black uppercase text-red-700">Counted</p><p className="text-lg font-black">{money.format(selected.countedCash ?? 0)}</p></div><div><p className="text-[10px] font-black uppercase text-red-700">Difference</p><p className="text-lg font-black">{money.format(selected.cashDifference ?? 0)}</p></div>{selected.closingNote?<p className="sm:col-span-3 text-sm"><strong>Closing note:</strong> {selected.closingNote}</p>:null}</div>:null}
      <button onClick={()=>window.print()} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#173044] font-black text-white print:hidden"><FontAwesomeIcon icon={faPrint}/>Print this register report</button>
    </div></section></div> : null}
  </div>;
}
