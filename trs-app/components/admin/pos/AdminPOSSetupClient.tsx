"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_POS_PRINT_SETTINGS, readPosPrintSettings, savePosPrintSettings, type PosPrintSettings } from "@/lib/pos/print-settings";

type Register = { _id: string; name: string; code: string; locationLabel: string; isActive: boolean };
type POSItem = { _id: string; name: string; sku: string; category: string; sellingPrice: number; sendToKds: boolean; isActive: boolean };
type ApiErrorDetail = { field?: string; message?: string };
type ApiResponse<T> = { success: boolean; message: string; data: T; errors?: ApiErrorDetail[] };

function normalizeRegisterCode(value: string) {
  return value
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 30);
}

function responseMessage<T>(json: ApiResponse<T>) {
  const details = json.errors
    ?.map((error) => [error.field, error.message].filter(Boolean).join(": "))
    .filter(Boolean);

  return details?.length ? details.join(" ") : json.message;
}

export function AdminPOSSetupClient() {
  const [registers, setRegisters] = useState<Register[]>([]);
  const [items, setItems] = useState<POSItem[]>([]);
  const [message, setMessage] = useState("");
  const [registerForm, setRegisterForm] = useState({ name: "", code: "", locationLabel: "" });
  const [itemForm, setItemForm] = useState({ name: "", sellingPrice: "" });
  const [printSettings, setPrintSettings] = useState<PosPrintSettings>(DEFAULT_POS_PRINT_SETTINGS);

  const load = useCallback(async () => {
    const [registerResponse, itemResponse] = await Promise.all([
      fetch("/api/v1/admin/pos/registers", { cache: "no-store" }),
      fetch("/api/v1/admin/pos/items", { cache: "no-store" }),
    ]);
    if (registerResponse.ok) setRegisters(((await registerResponse.json()) as ApiResponse<Register[]>).data);
    if (itemResponse.ok) setItems(((await itemResponse.json()) as ApiResponse<POSItem[]>).data);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPrintSettings(readPosPrintSettings());
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function createRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/v1/admin/pos/registers", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...registerForm,
        code: normalizeRegisterCode(registerForm.code),
        isActive: true,
      }),
    });
    const json = (await response.json()) as ApiResponse<Register>;
    setMessage(responseMessage(json));
    if (response.ok) {
      setRegisterForm({ name: "", code: "", locationLabel: "" });
      await load();
    }
  }

  async function createItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/v1/admin/pos/items", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: itemForm.name,
        sellingPrice: Number(itemForm.sellingPrice),
      }),
    });
    const json = (await response.json()) as ApiResponse<POSItem>;
    setMessage(responseMessage(json));
    if (response.ok) {
      setItemForm({ name: "", sellingPrice: "" });
      await load();
    }
  }

  function persistPrintSettings() {
    savePosPrintSettings(printSettings);
    setMessage("POS print settings saved for this billing device.");
  }

  return (
    <section className="space-y-6">
      <div><p className="text-xs font-black uppercase tracking-[.18em] text-red-700">Point of Sale</p><h1 className="mt-1 text-3xl font-black text-slate-950">POS setup</h1><p className="mt-2 text-sm text-slate-600">Create billing registers and counter-only items that never appear on the public website.</p></div>
      {message && <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700">{message}</p>}
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">Registers</h2>
          <form onSubmit={(event) => void createRegister(event)} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input required value={registerForm.name} onChange={(event) => setRegisterForm((current) => ({ ...current, name: event.target.value }))} className="h-11 rounded-xl border border-slate-300 px-3" placeholder="Register name" />
            <input required value={registerForm.code} onChange={(event) => { const code = normalizeRegisterCode(event.currentTarget.value); setRegisterForm((current) => ({ ...current, code })); }} className="h-11 rounded-xl border border-slate-300 px-3" placeholder="Code, e.g. COUNTER-1" />
            <input value={registerForm.locationLabel} onChange={(event) => setRegisterForm((current) => ({ ...current, locationLabel: event.target.value }))} className="h-11 rounded-xl border border-slate-300 px-3 sm:col-span-2" placeholder="Location label" />
            <button className="rounded-xl bg-red-700 px-4 py-3 font-black text-white sm:col-span-2">Create register</button>
          </form>
          <div className="mt-5 space-y-2">{registers.map((register) => <div key={register._id} className="rounded-xl border border-slate-200 p-3"><p className="font-black">{register.name} · {register.code}</p><p className="text-xs text-slate-500">{register.locationLabel || "No location label"}</p></div>)}</div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">POS-only items</h2>
          <form onSubmit={(event) => void createItem(event)} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input required value={itemForm.name} onChange={(event) => { const name = event.currentTarget.value; setItemForm((current) => ({ ...current, name })); }} className="h-11 rounded-xl border border-slate-300 px-3" placeholder="Item name, e.g. Water bottle" />
            <input required type="number" min="0" step="0.01" value={itemForm.sellingPrice} onChange={(event) => { const sellingPrice = event.currentTarget.value; setItemForm((current) => ({ ...current, sellingPrice })); }} className="h-11 rounded-xl border border-slate-300 px-3" placeholder="Selling price" />
            <button className="rounded-xl bg-red-700 px-4 py-3 font-black text-white sm:col-span-2">Create POS-only item</button>
          </form>
          <div className="mt-5 max-h-80 space-y-2 overflow-y-auto">{items.map((item) => <div key={item._id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3"><div><p className="font-black">{item.name}</p><p className="text-xs text-slate-500">{item.category} · {item.sku}</p></div><p className="font-black">₹{item.sellingPrice.toFixed(2)}</p></div>)}</div>
        </div>
      </div>
      <section id="pos-print-settings" className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div><p className="text-xs font-black uppercase tracking-[.18em] text-red-700">Printer workflow</p><h2 className="mt-1 text-2xl font-black">KOT & invoice print settings</h2><p className="mt-2 text-sm text-slate-600">These settings are saved on this POS device, allowing different counters to use different printers and paper widths.</p></div>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><h3 className="font-black text-amber-950">Kitchen KOT</h3><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-black">Paper width<select value={printSettings.kotPaper} onChange={(event) => {
  const kotPaper = event.currentTarget.value as PosPrintSettings["kotPaper"];
  setPrintSettings((current) => ({ ...current, kotPaper }));
}} className="mt-1 h-11 w-full rounded-xl border bg-white px-3"><option value="58mm">58 mm</option><option value="80mm">80 mm</option></select></label><label className="text-xs font-black">Copies<input type="number" min="1" max="3" value={printSettings.kotCopies} onChange={(event) => {
  const kotCopies = Math.min(3, Math.max(1, Number(event.currentTarget.value) || 1));
  setPrintSettings((current) => ({ ...current, kotCopies }));
}} className="mt-1 h-11 w-full rounded-xl border bg-white px-3" /></label></div><div className="mt-4 grid gap-3"><Toggle label="Auto-print KOT after sale" checked={printSettings.autoPrintKot} onChange={(value)=>setPrintSettings((s)=>({...s,autoPrintKot:value}))}/><Toggle label="Show customer on KOT" checked={printSettings.showCustomerOnKot} onChange={(value)=>setPrintSettings((s)=>({...s,showCustomerOnKot:value}))}/><Toggle label="Show prices on KOT" checked={printSettings.showPricesOnKot} onChange={(value)=>setPrintSettings((s)=>({...s,showPricesOnKot:value}))}/></div></div>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4"><h3 className="font-black text-red-950">Customer invoice</h3><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-black">Format<select value={printSettings.invoicePaper} onChange={(event) => {
  const invoicePaper = event.currentTarget.value as PosPrintSettings["invoicePaper"];
  setPrintSettings((current) => ({ ...current, invoicePaper }));
}} className="mt-1 h-11 w-full rounded-xl border bg-white px-3"><option value="a4">A4 branded</option><option value="80mm">80 mm thermal</option><option value="58mm">58 mm thermal</option></select></label><label className="text-xs font-black">Copies<input type="number" min="1" max="3" value={printSettings.invoiceCopies} onChange={(event) => {
  const invoiceCopies = Math.min(3, Math.max(1, Number(event.currentTarget.value) || 1));
  setPrintSettings((current) => ({ ...current, invoiceCopies }));
}} className="mt-1 h-11 w-full rounded-xl border bg-white px-3" /></label></div><div className="mt-4 grid gap-3"><Toggle label="Auto-print invoice after payment" checked={printSettings.autoPrintInvoice} onChange={(value)=>setPrintSettings((s)=>({...s,autoPrintInvoice:value}))}/><Toggle label="Show CGST / SGST breakup" checked={printSettings.showTaxBreakup} onChange={(value)=>setPrintSettings((s)=>({...s,showTaxBreakup:value}))}/><Toggle label="Print Invoice Verification QR" checked={printSettings.showInvoiceQr} onChange={(value)=>setPrintSettings((s)=>({...s,showInvoiceQr:value}))}/></div></div>
        </div>
        <button type="button" onClick={persistPrintSettings} className="mt-5 h-12 w-full rounded-xl bg-slate-950 px-5 text-sm font-black text-white sm:w-auto">Save print settings</button>
      </section>
      <a href="/admin/pos" className="inline-flex rounded-xl border border-slate-300 px-5 py-3 text-sm font-black">Back to POS</a>
    </section>
  );
}


function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/70 bg-white px-3 py-3 text-xs font-black"><span>{label}</span><input
  type="checkbox"
  checked={checked}
  onChange={(event) => {
    const nextChecked = event.currentTarget.checked;
    onChange(nextChecked);
  }}
  className="h-4 w-4 accent-red-700"
/></label>;
}
