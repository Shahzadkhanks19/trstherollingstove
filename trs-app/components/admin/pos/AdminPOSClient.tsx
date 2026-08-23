"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CustomActionModal } from "@/components/admin/CustomActionModal";

type CatalogItem = {
  id: string;
  sourceType: "menu" | "pos";
  name: string;
  imageUrl: string;
  category: string;
  price: number;
  allowCustomPrice?: boolean;
  variants?: Array<{ id: string; name: string; price: number }>;
};

type CartLine = {
  key: string;
  itemId: string;
  sourceType: "menu" | "pos";
  name: string;
  variantId?: string | null;
  variantName?: string;
  unitPrice: number;
  quantity: number;
};

type Register = { _id: string; name: string; code: string; locationLabel: string };
type Shift = { _id: string; registerId: Register; openingCash: number; expectedCash: number };
type ApiResponse<T> = { success: boolean; message: string; data: T };

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);
}

export function AdminPOSClient({ canManage }: { canManage: boolean }) {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [registers, setRegisters] = useState<Register[]>([]);
  const [shift, setShift] = useState<Shift | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [orderMode, setOrderMode] = useState<"dine_in" | "takeaway">("takeaway");
  const [tableNumber, setTableNumber] = useState("");
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi">("cash");
  const [upiReference, setUpiReference] = useState("");
  const [openingCash, setOpeningCash] = useState("0");
  const [selectedRegister, setSelectedRegister] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [lastInvoiceId, setLastInvoiceId] = useState("");
  const [upiConfirmOpen, setUpiConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    const [catalogResponse, registerResponse, shiftResponse] = await Promise.all([
      fetch("/api/v1/pos/catalog", { cache: "no-store" }),
      fetch("/api/v1/admin/pos/registers", { cache: "no-store" }),
      fetch("/api/v1/pos/shifts/current?mine=true", { cache: "no-store" }),
    ]);
    if (catalogResponse.ok) {
      const json = (await catalogResponse.json()) as ApiResponse<{ menuItems: CatalogItem[]; posItems: CatalogItem[] }>;
      setCatalog([...json.data.menuItems, ...json.data.posItems]);
    }
    if (registerResponse.ok) {
      const json = (await registerResponse.json()) as ApiResponse<Register[]>;
      setRegisters(json.data);
      setSelectedRegister((current) => current || json.data[0]?._id || "");
    }
    if (shiftResponse.ok) {
      const json = (await shiftResponse.json()) as ApiResponse<Shift | null>;
      setShift(json.data);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const categories = useMemo(() => ["All", ...Array.from(new Set(catalog.map((item) => item.category)))], [catalog]);
  const visibleItems = useMemo(() => catalog.filter((item) => {
    const matchesCategory = category === "All" || item.category === category;
    const matchesQuery = item.name.toLowerCase().includes(query.trim().toLowerCase());
    return matchesCategory && matchesQuery;
  }), [catalog, category, query]);
  const total = useMemo(() => cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0), [cart]);

  function addItem(item: CatalogItem, variant?: { id: string; name: string; price: number }) {
    const key = `${item.sourceType}:${item.id}:${variant?.id ?? "base"}`;
    setCart((current) => {
      const existing = current.find((line) => line.key === key);
      if (existing) return current.map((line) => line.key === key ? { ...line, quantity: line.quantity + 1 } : line);
      return [...current, {
        key, itemId: item.id, sourceType: item.sourceType, name: item.name,
        variantId: variant?.id ?? null, variantName: variant?.name ?? "", unitPrice: variant?.price ?? item.price, quantity: 1,
      }];
    });
  }

  async function openShift() {
    if (!selectedRegister) return;
    setIsSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/pos/shifts/open", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registerId: selectedRegister, openingCash: Number(openingCash) || 0 }),
      });
      const json = (await response.json()) as ApiResponse<Shift>;
      if (!response.ok) throw new Error(json.message);
      setShift(json.data);
      setMessage("Register shift opened.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to open shift."); }
    finally { setIsSubmitting(false); }
  }

  async function completeSale() {
    if (!shift || cart.length === 0) return;
    if (paymentMethod === "upi" && !upiConfirmOpen) { setUpiConfirmOpen(true); return; }
    setUpiConfirmOpen(false);
    setIsSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/pos/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftId: shift._id, orderMode, tableNumber, customerName, customerPhone,
          customerNote: "", paymentMethod, upiReference,
          items: cart.map((line) => ({ sourceType: line.sourceType, itemId: line.itemId, variantId: line.variantId, quantity: line.quantity, unitPrice: line.unitPrice, specialInstructions: "" })),
        }),
      });
      const json = (await response.json()) as ApiResponse<{ order: { orderNumber: string }; invoice: { _id: string } }>;
      if (!response.ok) throw new Error(json.message);
      setLastInvoiceId(json.data.invoice._id);
      setMessage(`${json.data.order.orderNumber} created, sent to live orders/KDS, and bill saved.`);
      setCart([]);
      setUpiReference("");
      window.open(`/api/v1/pos/bills/${json.data.invoice._id}/print`, "_blank", "noopener,noreferrer");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to complete sale."); }
    finally { setIsSubmitting(false); }
  }

  if (!shift) {
    return (
      <section className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[.2em] text-red-700">Point of Sale</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Open a register shift</h1>
        <p className="mt-2 text-sm text-slate-600">A shift is required before creating cash or PhonePe QR/UPI reference sales.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <select value={selectedRegister} onChange={(event) => setSelectedRegister(event.target.value)} className="h-12 rounded-xl border border-slate-300 px-4">
            <option value="">Select register</option>
            {registers.map((register) => <option key={register._id} value={register._id}>{register.name} ({register.code})</option>)}
          </select>
          <input value={openingCash} onChange={(event) => setOpeningCash(event.target.value)} type="number" min="0" className="h-12 rounded-xl border border-slate-300 px-4" placeholder="Opening cash" />
        </div>
        <button type="button" disabled={isSubmitting || !selectedRegister} onClick={() => void openShift()} className="mt-5 rounded-xl bg-red-700 px-6 py-3 font-black text-white disabled:opacity-50">Open shift</button>
        {registers.length === 0 && <p className="mt-4 text-sm text-amber-700">Create a POS register through the existing POS register API before opening a shift.</p>}
        {message && <p className="mt-4 text-sm font-semibold text-slate-700">{message}</p>}
      </section>
    );
  }

  return (
    <section className="grid min-h-[calc(100vh-8rem)] gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
      <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs font-black uppercase tracking-[.18em] text-red-700">TRS POS</p><h1 className="text-2xl font-black text-slate-950">New sale</h1></div>
          <div className="text-right text-xs font-bold text-slate-500">Shift open<br />Expected cash: {formatMoney(shift.expectedCash)}</div>
        </div>
        <div className="mt-4 flex gap-3">
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 min-w-0 flex-1 rounded-xl border border-slate-300 px-4" placeholder="Search menu and POS-only items" />
          {canManage && <a href="/admin/pos/setup" className="grid h-11 place-items-center rounded-xl border border-slate-300 px-4 text-xs font-black">Manage items</a>}
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {categories.map((value) => <button key={value} type="button" onClick={() => setCategory(value)} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-black ${category === value ? "bg-red-700 text-white" : "bg-slate-100 text-slate-700"}`}>{value}</button>)}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-4">
          {visibleItems.map((item) => (
            <article key={`${item.sourceType}:${item.id}`} className="rounded-2xl border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-black uppercase text-red-700">{item.sourceType === "pos" ? "POS only" : item.category}</p><h2 className="mt-1 font-black text-slate-950">{item.name}</h2></div><span className="text-sm font-black">{formatMoney(item.price)}</span></div>
              {item.variants && item.variants.length > 0 ? <div className="mt-3 grid gap-2">{item.variants.map((variant) => <button key={variant.id} type="button" onClick={() => addItem(item, variant)} className="rounded-lg bg-slate-100 px-3 py-2 text-left text-xs font-bold">{variant.name} · {formatMoney(variant.price)}</button>)}</div> : <button type="button" onClick={() => addItem(item)} className="mt-3 w-full rounded-lg bg-red-700 px-3 py-2 text-xs font-black text-white">Add</button>}
            </article>
          ))}
        </div>
      </div>

      <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between"><h2 className="text-xl font-black">Current bill</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">{cart.reduce((sum, line) => sum + line.quantity, 0)} items</span></div>
        <div className="mt-4 max-h-[38vh] space-y-2 overflow-y-auto">
          {cart.map((line) => <div key={line.key} className="rounded-xl border border-slate-200 p-3"><div className="flex justify-between gap-2"><div><p className="font-black">{line.name}</p>{line.variantName && <p className="text-xs text-slate-500">{line.variantName}</p>}</div><p className="font-black">{formatMoney(line.unitPrice * line.quantity)}</p></div><div className="mt-2 flex items-center gap-2"><button type="button" onClick={() => setCart((current) => current.flatMap((item) => item.key === line.key ? (item.quantity > 1 ? [{ ...item, quantity: item.quantity - 1 }] : []) : [item]))} className="h-8 w-8 rounded-lg bg-slate-100 font-black">−</button><span className="min-w-6 text-center font-black">{line.quantity}</span><button type="button" onClick={() => setCart((current) => current.map((item) => item.key === line.key ? { ...item, quantity: item.quantity + 1 } : item))} className="h-8 w-8 rounded-lg bg-slate-100 font-black">+</button></div></div>)}
          {cart.length === 0 && <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">Add items to begin a bill.</p>}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => setOrderMode("takeaway")} className={`rounded-xl px-3 py-2 text-xs font-black ${orderMode === "takeaway" ? "bg-slate-950 text-white" : "bg-slate-100"}`}>Takeaway</button><button type="button" onClick={() => setOrderMode("dine_in")} className={`rounded-xl px-3 py-2 text-xs font-black ${orderMode === "dine_in" ? "bg-slate-950 text-white" : "bg-slate-100"}`}>Dine-in</button></div>
        {orderMode === "dine_in" && <input value={tableNumber} onChange={(event) => setTableNumber(event.target.value)} className="mt-2 h-10 w-full rounded-xl border border-slate-300 px-3" placeholder="Table number" />}
        <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} className="mt-2 h-10 w-full rounded-xl border border-slate-300 px-3" placeholder="Customer name" />
        <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} className="mt-2 h-10 w-full rounded-xl border border-slate-300 px-3" placeholder="Phone (optional)" />
        <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => setPaymentMethod("cash")} className={`rounded-xl px-3 py-3 text-xs font-black ${paymentMethod === "cash" ? "bg-emerald-700 text-white" : "bg-slate-100"}`}>Cash</button><button type="button" onClick={() => setPaymentMethod("upi")} className={`rounded-xl px-3 py-3 text-xs font-black ${paymentMethod === "upi" ? "bg-violet-700 text-white" : "bg-slate-100"}`}>PhonePe QR / UPI</button></div>
        {paymentMethod === "upi" && <input value={upiReference} onChange={(event) => setUpiReference(event.target.value)} className="mt-2 h-10 w-full rounded-xl border border-slate-300 px-3" placeholder="UPI reference (optional)" />}
        <div className="mt-4 flex justify-between border-t border-slate-200 pt-4 text-xl font-black"><span>Total</span><span>{formatMoney(total)}</span></div>
        <button type="button" disabled={isSubmitting || cart.length === 0} onClick={() => void completeSale()} className="mt-4 w-full rounded-xl bg-red-700 px-4 py-4 font-black text-white disabled:opacity-50">Complete, save & print</button>
        {lastInvoiceId && <button type="button" onClick={() => window.open(`/api/v1/pos/bills/${lastInvoiceId}/print`, "_blank", "noopener,noreferrer")} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-black">Reprint last bill</button>}
        {message && <p className="mt-3 text-sm font-semibold text-slate-700">{message}</p>}
      </aside>
          <CustomActionModal open={upiConfirmOpen} title="Confirm PhonePe / UPI payment" description="Confirm the payment in PhonePe or your merchant app before completing this sale." confirmLabel="Payment confirmed" onClose={() => setUpiConfirmOpen(false)} onConfirm={() => void completeSale()} />
</section>
  );
}
