"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { buildInvoicePrintUrl, buildKotPrintUrl } from "@/lib/pos/print-links";
import type { PosCartState } from "@/types/pos";

type Bill = {
  _id: string;
  orderId: string;
  invoiceNumber: string;
  orderNumber: string;
  issuedAt: string;
  customerSnapshot: { name: string; phone?: string };
  paymentMethod: string;
  grandTotal: number;
  printCount: number;
  orderStatus: string;
  paymentStatus: string;
};
type ApiResponse<T> = { success: boolean; message: string; data: T };

async function readApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const contentType = response.headers.get("content-type") ?? "";
  const rawBody = await response.text();

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(rawBody) as ApiResponse<T>;
    } catch {
      throw new Error(`The server returned malformed JSON (${response.status}).`);
    }
  }

  const looksLikeHtml =
    rawBody.trimStart().startsWith("<!DOCTYPE") ||
    rawBody.trimStart().startsWith("<html");

  if (looksLikeHtml) {
    if (response.redirected || response.url.includes("/admin/login")) {
      throw new Error("Your admin session expired. Refresh the page and sign in again.");
    }

    if (response.status === 404) {
      throw new Error(
        "The customer-update API route is not available on this deployment. Rebuild and restart the latest TRS app.",
      );
    }

    throw new Error(
      `The customer-update request returned an HTML error page (${response.status}). Check the TRS app logs.`,
    );
  }

  throw new Error(
    rawBody.trim() ||
      `The customer-update request failed with status ${response.status}.`,
  );
}
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function PosBillsClient() {
  const [query, setQuery] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [bills, setBills] = useState<Bill[]>([]);
  const [message, setMessage] = useState("");
  const [cancelBill, setCancelBill] = useState<Bill | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [refundMethod, setRefundMethod] = useState<"cash" | "upi">("cash");
  const [busy, setBusy] = useState(false);
  const [customerBill, setCustomerBill] = useState<Bill | null>(null);
  const [customerForm, setCustomerForm] = useState({ name: "", phone: "", email: "" });

  const load = useCallback(async (signal?: AbortSignal) => {
    const params = new URLSearchParams({ limit: "100" });
    if (query.trim()) params.set("q", query.trim());
    if (paymentMethod) params.set("paymentMethod", paymentMethod);
    const response = await fetch(`/api/v1/pos/bills?${params}`, { cache: "no-store", signal });
    const json = await response.json() as ApiResponse<Bill[]>;
    if (!response.ok) throw new Error(json.message);
    setBills(json.data);
    setMessage("");
  }, [paymentMethod, query]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void load(controller.signal).catch((error: unknown) => {
        if ((error as Error).name !== "AbortError") setMessage(error instanceof Error ? error.message : "Unable to load bills.");
      });
    }, 250);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [load]);

  async function modifyOrder(bill: Bill) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/v1/pos/orders/${bill.orderId}/edit-copy`, { cache: "no-store" });
      const json = await response.json() as ApiResponse<{ cart: PosCartState; orderNumber: string }>;
      if (!response.ok) throw new Error(json.message);
      window.localStorage.setItem("trs-pos-rebill-order", JSON.stringify(json.data));
      window.location.assign("/admin/pos");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load order for modification.");
      setBusy(false);
    }
  }

  async function cancelPaidOrder() {
    if (!cancelBill) return;
    if (cancelReason.trim().length < 3) {
      setMessage("Enter a cancellation reason of at least 3 characters.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/v1/pos/orders/${cancelBill.orderId}/cancel-paid`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ method: refundMethod, reason: cancelReason.trim() }),
      });
      const json = await response.json() as ApiResponse<unknown>;
      if (!response.ok) throw new Error(json.message);
      setMessage(`${cancelBill.orderNumber} cancelled and fully refunded.`);
      setCancelBill(null);
      setCancelReason("");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to cancel this order.");
    } finally {
      setBusy(false);
    }
  }

  async function attachCustomer() {
    if (!customerBill) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(
        `/api/v1/pos/orders/${encodeURIComponent(customerBill.orderId)}/customer`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify(customerForm),
        },
      );
      const json = await readApiResponse<unknown>(response);
      if (!response.ok || !json.success) {
        throw new Error(json.message || "Unable to attach customer.");
      }
      setMessage(`Customer attached to ${customerBill.orderNumber}. Invoice details updated.`);
      setCustomerBill(null); setCustomerForm({ name: "", phone: "", email: "" }); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to attach customer."); } finally { setBusy(false); }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.2em] text-red-700">Point of Sale</p><h1 className="text-3xl font-black text-slate-950">Bill history</h1></div><Link href="/admin/pos" className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">New sale</Link></div>
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_180px]"><input value={query} onChange={(event) => setQuery(event.currentTarget.value)} className="h-11 rounded-xl border border-slate-300 px-3" placeholder="Invoice, order, customer or phone" /><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.currentTarget.value)} className="h-11 rounded-xl border border-slate-300 px-3"><option value="">All payments</option><option value="cash">Cash</option><option value="upi">UPI</option><option value="split">Split</option></select></div>
      {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800">{message}</p>}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Prints</th><th className="px-4 py-3">Actions</th></tr></thead><tbody>{bills.map((bill) => { const closed = bill.orderStatus === "cancelled" || bill.paymentStatus === "refunded"; return <tr key={bill._id} className="border-t border-slate-100"><td className="px-4 py-3"><p className="font-black">{bill.invoiceNumber}</p><p className="text-xs text-slate-500">{bill.orderNumber} · {new Date(bill.issuedAt).toLocaleString()}</p>{closed && <span className="mt-1 inline-flex rounded-full bg-red-100 px-2 py-1 text-[10px] font-black uppercase text-red-700">Cancelled / refunded</span>}</td><td className="px-4 py-3"><p className="font-bold">{bill.customerSnapshot.name}</p><p className="text-xs text-slate-500">{bill.customerSnapshot.phone}</p></td><td className="px-4 py-3 font-black uppercase">{bill.paymentMethod}</td><td className="px-4 py-3 font-black">{money.format(bill.grandTotal)}</td><td className="px-4 py-3">{bill.printCount}</td><td className="px-4 py-3"><div className="flex min-w-72 flex-wrap gap-2"><button type="button" onClick={() => window.open(buildInvoicePrintUrl(bill._id), "_blank", "noopener,noreferrer")} className="rounded-lg bg-red-700 px-3 py-2 text-xs font-black text-white">Invoice</button><button type="button" onClick={() => window.open(buildKotPrintUrl(bill._id), "_blank", "noopener,noreferrer")} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white">Kitchen KOT</button><button type="button" disabled={busy || closed} onClick={() => void modifyOrder(bill)} className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white disabled:opacity-40">Duplicate / rebill</button><button type="button" disabled={busy || closed} onClick={() => { setCustomerBill(bill); setCustomerForm({ name: bill.customerSnapshot.name === "Walk-in Customer" ? "" : bill.customerSnapshot.name, phone: bill.customerSnapshot.phone ?? "", email: "" }); }} className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-xs font-black text-amber-900 disabled:opacity-40">Add customer later</button><button type="button" disabled={busy || closed} onClick={() => { setCancelBill(bill); setRefundMethod(bill.paymentMethod === "cash" ? "cash" : "upi"); }} className="rounded-lg border border-red-300 px-3 py-2 text-xs font-black text-red-700 disabled:opacity-40">Cancel order</button></div></td></tr>; })}</tbody></table></div>
        {bills.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No bills found.</p>}
      </div>

      {customerBill && <div className="fixed inset-0 z-[190] grid place-items-end bg-black/55 p-0 backdrop-blur-sm sm:place-items-center sm:p-5"><button type="button" className="absolute inset-0" onClick={() => !busy && setCustomerBill(null)} aria-label="Close customer attachment"/><section role="dialog" aria-modal="true" className="relative z-10 w-full rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-3xl"><h2 className="text-xl font-black">Add customer after checkout</h2><p className="mt-2 text-sm text-slate-600">Creates or matches a customer by phone, then updates the order and invoice.</p><div className="mt-4 space-y-3"><label className="block text-xs font-black">Customer name<input
  value={customerForm.name}
  onChange={(event) => {
    const name = event.currentTarget.value;
    setCustomerForm((current) => ({
      ...current,
      name,
    }));
  }}
  className="mt-1 h-11 w-full rounded-xl border px-3"
/></label><label className="block text-xs font-black">10-digit phone<input inputMode="numeric" maxLength={10} value={customerForm.phone} onChange={(event) => { const phone = event.currentTarget.value.replace(/\D/g, "").slice(0, 10); setCustomerForm((current) => ({ ...current, phone })); }} className="mt-1 h-11 w-full rounded-xl border px-3" /></label><label className="block text-xs font-black">Email (optional)<input
  type="email"
  value={customerForm.email}
  onChange={(event) => {
    const email = event.currentTarget.value;
    setCustomerForm((current) => ({
      ...current,
      email,
    }));
  }}
  className="mt-1 h-11 w-full rounded-xl border px-3"
/></label></div><div className="mt-5 grid grid-cols-2 gap-2"><button type="button" disabled={busy} onClick={() => setCustomerBill(null)} className="h-11 rounded-xl border font-black">Cancel</button><button type="button" disabled={busy} onClick={() => void attachCustomer()} className="h-11 rounded-xl bg-amber-500 font-black text-slate-950 disabled:opacity-50">{busy ? "Saving…" : "Create/link customer"}</button></div></section></div>}

      {cancelBill && <div className="fixed inset-0 z-[190] grid place-items-end bg-black/55 p-0 backdrop-blur-sm sm:place-items-center sm:p-5"><button type="button" className="absolute inset-0" onClick={() => !busy && setCancelBill(null)} aria-label="Close cancellation"/><section role="dialog" aria-modal="true" className="relative z-10 w-full rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-3xl"><h2 className="text-xl font-black">Cancel paid order</h2><p className="mt-2 text-sm text-slate-600">This records a full refund for <strong>{cancelBill.orderNumber}</strong> and marks the order cancelled. The original invoice remains preserved for audit.</p><label className="mt-4 block text-xs font-black">Refund through<select value={refundMethod} onChange={(event) => setRefundMethod(event.currentTarget.value as "cash" | "upi")} className="mt-1 h-11 w-full rounded-xl border px-3"><option value="cash">Cash</option><option value="upi">UPI / online</option></select></label><label className="mt-3 block text-xs font-black">Cancellation reason<textarea value={cancelReason} onChange={(event) => setCancelReason(event.currentTarget.value)} className="mt-1 min-h-28 w-full rounded-xl border p-3" placeholder="Required manager reason"/></label><div className="mt-5 grid grid-cols-2 gap-2"><button type="button" disabled={busy} onClick={() => setCancelBill(null)} className="h-11 rounded-xl border font-black">Keep order</button><button type="button" disabled={busy} onClick={() => void cancelPaidOrder()} className="h-11 rounded-xl bg-red-700 font-black text-white disabled:opacity-50">{busy ? "Cancelling…" : `Refund ${money.format(cancelBill.grandTotal)} & cancel`}</button></div></section></div>}
    </section>
  );
}
