"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowDown,
  faArrowUp,
  faCashRegister,
  faClockRotateLeft,
  faDoorOpen,
  faMoneyBillTransfer,
  faMoneyBillWave,
  faRotate,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

type ApiErrorDetail = { field?: string; path?: string; message?: string };
type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  errors?: ApiErrorDetail[];
};

type Person = { _id?: string; name?: string; email?: string };
type Register = { _id: string; name: string; code: string; isActive: boolean };
type MovementType = "cash_in" | "cash_out" | "cash_sale" | "cash_refund";
type CashMovement = {
  _id: string;
  type: MovementType;
  amount: number;
  reason: string;
  referenceType: "manual" | "order" | "payment" | "refund";
  createdAt: string;
  createdBy?: Person | string;
};
type Shift = {
  _id: string;
  status?: "open" | "closed";
  expectedCash: number;
  openingCash: number;
  countedCash?: number | null;
  cashDifference?: number | null;
  registerId: Register;
  openedBy?: Person | string;
  closedBy?: Person | string;
  openedAt?: string;
  closedAt?: string | null;
  closingNote?: string;
  movements?: CashMovement[];
  movementSummary?: {
    openingCash: number;
    cashIn: number;
    cashOut: number;
    cashSales: number;
    cashRefunds: number;
    manualNet: number;
    calculatedExpectedCash: number;
  };
};

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const dateTime = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function apiErrorMessage<T>(response: ApiResponse<T>, fallback: string) {
  const details = response.errors
    ?.map((error) => `${error.field || error.path ? `${error.field || error.path}: ` : ""}${error.message || "Invalid value."}`)
    .filter(Boolean);
  return details?.length ? details.join(" · ") : response.message || fallback;
}

function personName(person?: Person | string) {
  if (!person) return "TRS staff";
  if (typeof person === "string") return "TRS staff";
  return person.name || person.email || "TRS staff";
}

function movementLabel(type: MovementType) {
  if (type === "cash_in") return "Cash added";
  if (type === "cash_out") return "Cash taken out";
  if (type === "cash_sale") return "Cash sale";
  return "Cash refund";
}

function movementPositive(type: MovementType) {
  return type === "cash_in" || type === "cash_sale";
}

function Ledger({ shift, compact = false }: { shift: Shift; compact?: boolean }) {
  const movements = shift.movements ?? [];
  const summary = shift.movementSummary;

  return (
    <section className="min-w-0 rounded-2xl border border-[#e5d9cf] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#C8102E]">Cash audit ledger</p>
          <h3 className="mt-1 text-base font-black text-[#122b3c]">
            {shift.registerId?.name ?? "Register"} · {shift.status === "closed" ? "Closed" : "Live"}
          </h3>
          <p className="mt-1 text-xs text-[#756960]">
            Opened {shift.openedAt ? dateTime.format(new Date(shift.openedAt)) : "today"}
            {shift.status === "closed" && shift.closedAt ? ` · Closed ${dateTime.format(new Date(shift.closedAt))}` : ""}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${shift.status === "closed" ? "bg-slate-100 text-slate-700" : "bg-emerald-100 text-emerald-800"}`}>
          {shift.status ?? "open"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl bg-[#f7f2ec] p-3"><p className="text-[9px] font-black uppercase text-[#8b7e75]">Opening</p><p className="mt-1 text-sm font-black text-[#122b3c]">{money.format(shift.openingCash ?? 0)}</p></div>
        <div className="rounded-xl bg-emerald-50 p-3"><p className="text-[9px] font-black uppercase text-emerald-700">Cash added</p><p className="mt-1 text-sm font-black text-emerald-900">{money.format(summary?.cashIn ?? 0)}</p></div>
        <div className="rounded-xl bg-amber-50 p-3"><p className="text-[9px] font-black uppercase text-amber-700">Cash out</p><p className="mt-1 text-sm font-black text-amber-900">{money.format(summary?.cashOut ?? 0)}</p></div>
        <div className="rounded-xl bg-[#111820] p-3 text-white"><p className="text-[9px] font-black uppercase text-white/55">Expected</p><p className="mt-1 text-sm font-black">{money.format(shift.expectedCash ?? 0)}</p></div>
      </div>

      <div className={`mt-4 space-y-2 ${compact ? "max-h-56" : "max-h-72"} overflow-y-auto pr-1 [scrollbar-width:thin]`}>
        <div className="flex items-start justify-between gap-3 rounded-xl border border-[#eadfd6] bg-[#fffdf9] p-3">
          <div className="min-w-0">
            <p className="text-xs font-black text-[#122b3c]">Opening cash</p>
            <p className="mt-1 text-[11px] text-[#756960]">Register opened by {personName(shift.openedBy)}</p>
          </div>
          <p className="shrink-0 text-sm font-black text-emerald-700">+{money.format(shift.openingCash ?? 0)}</p>
        </div>

        {movements.map((movement) => {
          const positive = movementPositive(movement.type);
          return (
            <article key={movement._id} className="flex items-start justify-between gap-3 rounded-xl border border-[#eadfd6] bg-white p-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${positive ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  <FontAwesomeIcon icon={positive ? faArrowUp : faArrowDown} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-black text-[#122b3c]">{movementLabel(movement.type)}</p>
                  <p className="mt-1 break-words text-[11px] text-[#756960]">{movement.reason || "No reason recorded"}</p>
                  <p className="mt-1 text-[10px] font-bold text-[#9a8c82]">
                    {dateTime.format(new Date(movement.createdAt))} · {personName(movement.createdBy)}
                  </p>
                </div>
              </div>
              <p className={`shrink-0 text-sm font-black ${positive ? "text-emerald-700" : "text-amber-700"}`}>
                {positive ? "+" : "−"}{money.format(movement.amount)}
              </p>
            </article>
          );
        })}

        {!movements.length ? (
          <p className="rounded-xl border border-dashed border-[#d9ccc2] px-3 py-5 text-center text-xs font-bold text-[#8b7e75]">No cash movements have been recorded yet.</p>
        ) : null}
      </div>

      {shift.status === "closed" ? (
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center">
          <div><p className="text-[9px] font-black uppercase text-slate-500">Expected</p><p className="mt-1 text-xs font-black text-slate-900">{money.format(shift.expectedCash ?? 0)}</p></div>
          <div><p className="text-[9px] font-black uppercase text-slate-500">Counted</p><p className="mt-1 text-xs font-black text-slate-900">{money.format(shift.countedCash ?? 0)}</p></div>
          <div><p className="text-[9px] font-black uppercase text-slate-500">Difference</p><p className={`mt-1 text-xs font-black ${(shift.cashDifference ?? 0) === 0 ? "text-emerald-700" : "text-red-700"}`}>{money.format(shift.cashDifference ?? 0)}</p></div>
        </div>
      ) : null}
    </section>
  );
}

export function PosCashDrawerControl() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shift, setShift] = useState<Shift | null>(null);
  const [todayShifts, setTodayShifts] = useState<Shift[]>([]);
  const [registers, setRegisters] = useState<Register[]>([]);
  const [registerId, setRegisterId] = useState("");
  const [openingCash, setOpeningCash] = useState("0");
  const [cashToAdd, setCashToAdd] = useState("");
  const [cashInReason, setCashInReason] = useState("Opening/change cash added before sales");
  const [cashToRemove, setCashToRemove] = useState("");
  const [cashOutReason, setCashOutReason] = useState("");
  const [countedCash, setCountedCash] = useState("");
  const [closingNote, setClosingNote] = useState("");
  const [closeApprovalNote, setCloseApprovalNote] = useState("");
  const [message, setMessage] = useState("");

  const loadDrawer = useCallback(async () => {
    const [shiftResponse, registersResponse, historyResponse] = await Promise.all([
      fetch("/api/v1/pos/shifts/current?mine=true", { cache: "no-store", credentials: "include" }),
      fetch("/api/v1/admin/pos/registers", { cache: "no-store", credentials: "include" }),
      fetch("/api/v1/pos/shifts/history", { cache: "no-store", credentials: "include" }),
    ]);
    const shiftJson = await shiftResponse.json() as ApiResponse<Shift | null>;
    const registersJson = await registersResponse.json() as ApiResponse<Register[]>;
    const historyJson = await historyResponse.json() as ApiResponse<Shift[]>;
    if (!shiftResponse.ok) throw new Error(apiErrorMessage(shiftJson, "Unable to load the current cash drawer."));
    if (!registersResponse.ok) throw new Error(apiErrorMessage(registersJson, "Unable to load POS registers."));
    if (!historyResponse.ok) throw new Error(apiErrorMessage(historyJson, "Unable to load today's cash activity."));

    const activeRegisters = registersJson.data.filter((register) => register.isActive);
    const history = historyJson.data ?? [];
    const activeShift = shiftJson.data
      ? history.find((item) => item._id === shiftJson.data?._id) ?? shiftJson.data
      : null;

    setShift(activeShift);
    setTodayShifts(history);
    setRegisters(activeRegisters);
    setRegisterId((current) => current || activeRegisters[0]?._id || "");
  }, []);

  const closedToday = useMemo(
    () => todayShifts.filter((item) => item.status === "closed"),
    [todayShifts],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void loadDrawer().catch(() => undefined); }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadDrawer]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKeyDown(event: KeyboardEvent) { if (event.key === "Escape") setOpen(false); }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    const refresh = () => { void loadDrawer().catch(() => undefined); };
    window.addEventListener("trs:pos-cash-drawer-changed", refresh);
    return () => window.removeEventListener("trs:pos-cash-drawer-changed", refresh);
  }, [loadDrawer]);

  async function refreshDrawer() {
    setLoading(true);
    setMessage("");
    try { await loadDrawer(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to refresh the cash drawer."); }
    finally { setLoading(false); }
  }

  async function openShift() {
    const amount = Math.round(Number(openingCash || 0));
    if (!registerId || !Number.isFinite(amount) || amount < 0) {
      setMessage("Select a register and enter a valid opening cash amount.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/pos/shifts/open", {
        method: "POST", headers: { "content-type": "application/json" }, credentials: "include",
        body: JSON.stringify({ registerId, openingCash: amount }),
      });
      const json = await response.json() as ApiResponse<Shift>;
      if (!response.ok) throw new Error(apiErrorMessage(json, "Unable to open the POS shift."));
      await loadDrawer();
      setMessage(`Shift opened with ${money.format(amount)}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to open the POS shift."); }
    finally { setLoading(false); }
  }

  async function addCash() {
    if (!shift) return;
    const amount = Math.round(Number(cashToAdd || 0));
    if (!Number.isFinite(amount) || amount <= 0) { setMessage("Enter a valid opening/change cash amount."); return; }
    if (cashInReason.trim().length < 2) { setMessage("Enter why cash is being added."); return; }
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/v1/pos/shifts/${shift._id}/cash-movements`, {
        method: "POST", headers: { "content-type": "application/json" }, credentials: "include",
        body: JSON.stringify({ type: "cash_in", amount, reason: cashInReason.trim() }),
      });
      const json = await response.json() as ApiResponse<{ expectedCash: number }>;
      if (!response.ok) throw new Error(apiErrorMessage(json, "Unable to add cash to the drawer."));
      setCashToAdd("");
      setMessage(`${money.format(amount)} added to today's drawer.`);
      await loadDrawer();
      window.dispatchEvent(new Event("trs:pos-cash-drawer-changed"));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to add cash to the drawer."); }
    finally { setLoading(false); }
  }

  async function removeCash() {
    if (!shift) return;
    const amount = Math.round(Number(cashToRemove || 0));
    if (!Number.isFinite(amount) || amount <= 0) { setMessage("Enter a valid cash-out amount."); return; }
    if (amount > Math.round(shift.expectedCash ?? 0)) { setMessage("Cash out cannot exceed the expected drawer balance."); return; }
    if (cashOutReason.trim().length < 2) { setMessage("Enter why cash is being removed."); return; }
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/v1/pos/shifts/${shift._id}/cash-movements`, {
        method: "POST", headers: { "content-type": "application/json" }, credentials: "include",
        body: JSON.stringify({ type: "cash_out", amount, reason: cashOutReason.trim() }),
      });
      const json = await response.json() as ApiResponse<{ expectedCash: number }>;
      if (!response.ok) throw new Error(apiErrorMessage(json, "Unable to remove cash from the drawer."));
      setCashToRemove("");
      setCashOutReason("");
      setMessage(`${money.format(amount)} removed from today's drawer.`);
      await loadDrawer();
      window.dispatchEvent(new Event("trs:pos-cash-drawer-changed"));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to remove cash from the drawer."); }
    finally { setLoading(false); }
  }

  async function closeShift() {
    if (!shift) return;
    const counted = Math.round(Number(countedCash || 0));
    if (!Number.isFinite(counted) || counted < 0) { setMessage("Enter the physically counted cash."); return; }
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/v1/pos/shifts/${shift._id}/close`, {
        method: "POST", headers: { "content-type": "application/json" }, credentials: "include",
        body: JSON.stringify({ countedCash: counted, closingNote: closingNote.trim(), closeApprovalNote: closeApprovalNote.trim() }),
      });
      const json = await response.json() as ApiResponse<Shift>;
      if (!response.ok) throw new Error(apiErrorMessage(json, "Unable to close the register shift."));
      const difference = counted - Math.round(shift.expectedCash ?? 0);
      setCountedCash(""); setClosingNote(""); setCloseApprovalNote("");
      await loadDrawer();
      setMessage(`Register closed. Counted ${money.format(counted)} · Difference ${difference >= 0 ? "+" : ""}${money.format(difference)}. The complete cash ledger remains below.`);
      window.dispatchEvent(new Event("trs:pos-cash-drawer-changed"));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to close the register shift."); }
    finally { setLoading(false); }
  }

  return (
    <>
      <button type="button" onClick={() => { setOpen(true); void refreshDrawer(); }} className="inline-flex items-center gap-2 rounded-xl border border-[#e5d9cf] bg-white px-3 py-2 text-xs font-black text-[#122b3c]">
        <FontAwesomeIcon icon={faCashRegister} className="text-[#C8102E]" />
        Today&apos;s drawer {money.format(shift?.expectedCash ?? 0)}
      </button>

      {open && typeof document !== "undefined" ? createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end justify-center overflow-hidden bg-black/55 p-0 backdrop-blur-sm sm:items-stretch sm:p-4 lg:items-center">
          <button type="button" className="absolute inset-0" onClick={() => setOpen(false)} aria-label="Close cash drawer" />
          <section role="dialog" aria-modal="true" aria-labelledby="pos-cash-drawer-title" className="relative z-10 flex h-[min(96dvh,960px)] w-full flex-col overflow-hidden rounded-t-[28px] bg-[#fffdf9] shadow-2xl sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-3xl sm:rounded-[28px] lg:max-h-[calc(100dvh-3rem)]">
            <header className="z-20 flex shrink-0 items-center justify-between border-b border-[#eadfd6] bg-[#fffdf9] px-4 py-4 sm:px-5">
              <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#C8102E]">Counter controls & audit</p><h2 id="pos-cash-drawer-title" className="text-xl font-black text-[#122b3c]">Today&apos;s cash drawer</h2></div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => void refreshDrawer()} disabled={loading} className="grid h-11 w-11 place-items-center rounded-xl border border-[#e5d9cf] bg-white text-[#122b3c] disabled:opacity-50" aria-label="Refresh cash drawer"><FontAwesomeIcon icon={faRotate} /></button>
                <button type="button" onClick={() => setOpen(false)} className="grid h-11 w-11 place-items-center rounded-xl bg-[#f3ece5] text-[#122b3c]" aria-label="Close cash drawer"><FontAwesomeIcon icon={faXmark} /></button>
              </div>
            </header>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] [scrollbar-width:thin] sm:p-5">
              {shift ? (
                <>
                  <div className="rounded-2xl bg-[#111820] p-5 text-white"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#E8A53A]">{shift.registerId?.name ?? "Register"}</p><p className="mt-2 break-words text-3xl font-black sm:text-4xl">{money.format(shift.expectedCash ?? 0)}</p><p className="mt-2 text-xs text-white/65">Live expected drawer: opening cash + cash sales + cash-ins − cash-outs − cash refunds.</p></div>

                  <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                    <section className="min-w-0 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4"><h3 className="text-sm font-black text-emerald-950">Add cash</h3><p className="mt-1 text-xs text-emerald-800">Add opening change or extra cash placed in the drawer.</p><input type="number" min="1" step="1" value={cashToAdd} onChange={(event) => setCashToAdd(event.currentTarget.value)} className="mt-3 h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm" placeholder="For example: 500" /><input value={cashInReason} onChange={(event) => setCashInReason(event.currentTarget.value)} maxLength={500} className="mt-2 h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm" placeholder="Reason for adding cash" /><button type="button" disabled={loading || !cashToAdd || cashInReason.trim().length < 2} onClick={() => void addCash()} className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 text-xs font-black text-white disabled:opacity-50"><FontAwesomeIcon icon={faMoneyBillWave} /> Add to drawer</button></section>
                    <section className="min-w-0 rounded-2xl border border-amber-200 bg-amber-50/70 p-4"><h3 className="text-sm font-black text-amber-950">Cash out</h3><p className="mt-1 text-xs text-amber-800">Record money removed from the physical drawer.</p><input type="number" min="1" step="1" value={cashToRemove} onChange={(event) => setCashToRemove(event.currentTarget.value)} className="mt-3 h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm" placeholder="Amount removed" /><input value={cashOutReason} onChange={(event) => setCashOutReason(event.currentTarget.value)} maxLength={500} className="mt-2 h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm" placeholder="Reason / purpose" /><button type="button" disabled={loading || !cashToRemove || cashOutReason.trim().length < 2} onClick={() => void removeCash()} className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-700 text-xs font-black text-white disabled:opacity-50"><FontAwesomeIcon icon={faMoneyBillTransfer} /> Remove cash</button></section>
                  </div>

                  <Ledger shift={shift} />

                  <section className="rounded-2xl border border-red-200 bg-red-50/70 p-4"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#C8102E] text-white"><FontAwesomeIcon icon={faDoorOpen} /></span><div><h3 className="text-sm font-black text-red-950">Close register</h3><p className="mt-1 text-xs text-red-800">Count physical cash. The ledger above is permanently retained after closure.</p></div></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-black text-[#756960]">Physically counted cash<input type="number" min="0" step="1" value={countedCash} onChange={(event) => setCountedCash(event.currentTarget.value)} className="mt-1 h-11 w-full rounded-xl border border-red-200 bg-white px-3 text-sm" placeholder={String(Math.round(shift.expectedCash ?? 0))} /></label><label className="text-xs font-black text-[#756960]">Closing note<input value={closingNote} onChange={(event) => setClosingNote(event.currentTarget.value)} maxLength={1000} className="mt-1 h-11 w-full rounded-xl border border-red-200 bg-white px-3 text-sm" placeholder="Optional note" /></label></div><label className="mt-3 block text-xs font-black text-[#756960]">Manager approval note<input value={closeApprovalNote} onChange={(event) => setCloseApprovalNote(event.currentTarget.value)} maxLength={500} className="mt-1 h-11 w-full rounded-xl border border-red-200 bg-white px-3 text-sm" placeholder="Optional reconciliation/approval note" /></label>{countedCash !== "" ? <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold text-red-900">Expected {money.format(shift.expectedCash ?? 0)} · Counted {money.format(Number(countedCash || 0))} · Difference {money.format(Number(countedCash || 0) - Number(shift.expectedCash ?? 0))}</p> : null}<button type="button" disabled={loading || countedCash === ""} onClick={() => void closeShift()} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#C8102E] text-sm font-black text-white disabled:opacity-50"><FontAwesomeIcon icon={faDoorOpen} /> Close and reconcile register</button></section>
                </>
              ) : (
                <><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">No open POS shift was found. You can still review today&apos;s closed cash ledgers below.</div><div className="grid gap-3 sm:grid-cols-2"><select value={registerId} onChange={(event) => setRegisterId(event.currentTarget.value)} className="h-11 rounded-xl border border-[#e5d9cf] bg-white px-3 text-sm font-bold"><option value="">Select register</option>{registers.map((register) => <option key={register._id} value={register._id}>{register.name} ({register.code})</option>)}</select><input type="number" min="0" step="1" value={openingCash} onChange={(event) => setOpeningCash(event.currentTarget.value)} className="h-11 rounded-xl border border-[#e5d9cf] px-3 text-sm" placeholder="Opening cash" /></div><button type="button" disabled={loading || !registerId} onClick={() => void openShift()} className="h-12 w-full rounded-xl bg-[#111820] text-sm font-black text-white disabled:opacity-50">Open register shift</button></>
              )}

              <a href="/admin/pos/cash-registers" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#173044] bg-white text-sm font-black text-[#173044] transition hover:bg-[#173044] hover:text-white"><FontAwesomeIcon icon={faClockRotateLeft} /> View full cash register history</a>

              {closedToday.length ? <section className="space-y-3"><div className="flex items-center gap-2"><FontAwesomeIcon icon={faClockRotateLeft} className="text-[#C8102E]" /><h3 className="text-base font-black text-[#122b3c]">Today&apos;s closed registers</h3></div>{closedToday.map((closedShift) => <Ledger key={closedShift._id} shift={closedShift} compact />)}</section> : null}

              {message ? <p className="rounded-xl bg-[#f3ece5] px-3 py-2 text-center text-xs font-bold text-[#6d625a]">{message}</p> : null}
              <button type="button" onClick={() => setOpen(false)} className="h-11 w-full rounded-xl border border-[#d9ccc2] bg-white text-sm font-black text-[#122b3c] sm:hidden">Close drawer controls</button>
            </div>
          </section>
        </div>, document.body) : null}
    </>
  );
}
