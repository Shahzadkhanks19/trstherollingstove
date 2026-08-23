"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRotateRight, faDownload, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import type { ProcurementIntelligenceResult, ProcurementPriority } from "@/services/procurement-intelligence.service";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const priorityStyles: Record<ProcurementPriority, string> = {
  critical: "bg-red-100 text-red-800", high: "bg-orange-100 text-orange-800",
  medium: "bg-amber-100 text-amber-800", low: "bg-emerald-100 text-emerald-800",
};

type Envelope = { data?: ProcurementIntelligenceResult; message?: string; error?: string };

function Card({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="rounded-3xl border border-neutral-200 bg-white p-5"><p className="text-xs font-black uppercase tracking-widest text-neutral-400">{label}</p><p className="mt-3 text-3xl font-black text-[#173044]">{value}</p><p className="mt-2 text-xs font-bold text-neutral-500">{detail}</p></article>;
}

export function ProcurementIntelligenceClient() {
  const [report, setReport] = useState<ProcurementIntelligenceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lookbackDays, setLookbackDays] = useState(90);
  const [horizonDays, setHorizonDays] = useState(30);
  const [leadTimeDays, setLeadTimeDays] = useState(7);
  const [risk, setRisk] = useState<"all" | ProcurementPriority>("all");
  const [search, setSearch] = useState("");

  const query = useMemo(() => new URLSearchParams({ lookbackDays: String(lookbackDays), horizonDays: String(horizonDays), leadTimeDays: String(leadTimeDays) }).toString(), [lookbackDays, horizonDays, leadTimeDays]);
  const load = useCallback(async (refresh = false) => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/v1/admin/procurement-intelligence?${query}&refresh=${refresh}`, { cache: "no-store" });
      const payload = await response.json() as Envelope;
      if (!response.ok || !payload.data) throw new Error(payload.message ?? payload.error ?? "Unable to load procurement intelligence.");
      setReport(payload.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load procurement intelligence.");
    } finally { setLoading(false); }
  }, [query]);

  useEffect(() => { const timer = window.setTimeout(() => void load(false), 0); return () => window.clearTimeout(timer); }, [load]);

  const visibleRows = useMemo(() => report?.recommendations.filter((row) =>
    (risk === "all" || row.priority === risk) &&
    (!search.trim() || `${row.itemName} ${row.sku} ${row.category} ${row.preferredSupplierName}`.toLowerCase().includes(search.trim().toLowerCase())),
  ) ?? [], [report, risk, search]);

  return <div className="space-y-6">
    <section className="rounded-3xl bg-neutral-950 p-6 text-white">
      <p className="text-xs font-black uppercase tracking-[.22em] text-amber-400">Phase 4.2.5 · Batch 3</p>
      <div className="mt-2 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between"><div><h1 className="text-3xl font-black">Inventory Demand & Procurement Intelligence</h1><p className="mt-2 max-w-3xl text-sm text-neutral-300">Convert inventory movement forecasts into purchase dates, supplier-wise buying plans, open-PO adjustments, stockout risk, excess-stock warnings and cost estimates.</p></div><div className="flex flex-wrap gap-2">{(["csv", "xlsx", "pdf"] as const).map((format) => <a key={format} href={`/api/v1/admin/procurement-intelligence?${query}&format=${format}`} className="rounded-xl border border-white/20 px-4 py-2 text-xs font-black uppercase"><FontAwesomeIcon icon={faDownload} className="mr-2" />{format}</a>)}<button type="button" onClick={() => void load(true)} disabled={loading} className="rounded-xl bg-[#C8102E] px-4 py-2 text-xs font-black disabled:opacity-50"><FontAwesomeIcon icon={faArrowRotateRight} className="mr-2" />Recalculate</button></div></div>
    </section>

    <section className="rounded-3xl border bg-white p-5"><div className="grid gap-4 md:grid-cols-4 md:items-end"><label className="text-xs font-black">History<select value={lookbackDays} onChange={(event) => setLookbackDays(Number(event.target.value))} className="mt-2 h-11 w-full rounded-xl border bg-white px-3">{[30,60,90,180,365].map((value) => <option key={value} value={value}>{value} days</option>)}</select></label><label className="text-xs font-black">Planning horizon<select value={horizonDays} onChange={(event) => setHorizonDays(Number(event.target.value))} className="mt-2 h-11 w-full rounded-xl border bg-white px-3">{[7,30,90].map((value) => <option key={value} value={value}>{value} days</option>)}</select></label><label className="text-xs font-black">Procurement lead time<input type="number" min="1" max="90" value={leadTimeDays} onChange={(event) => setLeadTimeDays(Number(event.target.value))} className="mt-2 h-11 w-full rounded-xl border px-3" /></label><button type="button" onClick={() => void load(false)} disabled={loading} className="h-11 rounded-xl bg-[#173044] px-5 text-xs font-black text-white disabled:opacity-50">Apply parameters</button></div></section>

    {error ? <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">{error}</p> : null}
    {loading && !report ? <section className="rounded-3xl border bg-white p-14 text-center font-bold text-neutral-500">Calculating inventory and procurement requirements…</section> : null}

    {report ? <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Card label="Net purchase plan" value={money.format(report.kpis.netRecommendedValue)} detail={`${report.kpis.criticalItems} critical items`} /><Card label="Stockout ≤ 7 days" value={String(report.kpis.stockoutWithin7Days)} detail={`${report.kpis.highRiskItems} total high-risk items`} /><Card label="Inventory health" value={`${report.kpis.inventoryHealthScore}/100`} detail={`${report.kpis.deadStockItems} dead · ${report.kpis.overstockItems} overstock`} /><Card label="Open purchase orders" value={money.format(report.kpis.openPurchaseOrderValue)} detail="Already deducted from recommendations" /></div>

      {report.alerts.length ? <section className="grid gap-3 lg:grid-cols-2">{report.alerts.map((alert) => <article key={alert.code} className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="font-black text-[#173044]"><FontAwesomeIcon icon={faTriangleExclamation} className="mr-2 text-amber-600" />{alert.title}</p><p className="mt-2 text-sm text-neutral-700">{alert.message}</p><p className="mt-2 text-xs font-bold text-amber-800">Action: {alert.suggestedAction}</p></article>)}</section> : null}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_.6fr]"><section className="rounded-3xl border bg-white p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-end"><label className="flex-1 text-xs font-black">Search<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Item, SKU, category or supplier" className="mt-2 h-11 w-full rounded-xl border px-3" /></label><label className="text-xs font-black">Priority<select value={risk} onChange={(event) => setRisk(event.target.value as typeof risk)} className="mt-2 h-11 rounded-xl border bg-white px-3"><option value="all">All priorities</option>{(["critical","high","medium","low"] as const).map((value) => <option key={value}>{value}</option>)}</select></label></div><div className="mt-5 overflow-x-auto"><table className="min-w-[1150px] w-full text-left text-xs"><thead><tr className="border-b text-neutral-500"><th className="p-3">Priority / item</th><th className="p-3">Stock & demand</th><th className="p-3">Stockout</th><th className="p-3">Purchase quantity</th><th className="p-3">Supplier</th><th className="p-3">Value</th><th className="p-3">Risk flags</th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.inventoryItemId} className="border-b align-top"><td className="p-3"><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${priorityStyles[row.priority]}`}>{row.priority}</span><p className="mt-2 font-black text-[#173044]">{row.itemName}</p><p className="text-neutral-500">{row.sku} · {row.category}</p></td><td className="p-3"><p className="font-black">{row.currentStock} {row.unit}</p><p className="text-neutral-500">{row.forecastDailyDemand}/day · {row.forecast30Demand}/30d</p></td><td className="p-3"><p className="font-black">{row.daysRemaining === null ? "No active demand" : `${row.daysRemaining} days`}</p><p className="text-neutral-500">Buy by {row.recommendedPurchaseDate}</p></td><td className="p-3"><p className="font-black">{row.netRecommendedQuantity} {row.unit}</p><p className="text-neutral-500">Gross {row.grossRecommendedQuantity} − open PO {row.openPurchaseOrderQuantity}</p></td><td className="p-3"><p className="font-black">{row.preferredSupplierName}</p><p className="text-neutral-500">{money.format(row.estimatedUnitCost)}/{row.unit}</p></td><td className="p-3 font-black text-[#C8102E]">{money.format(row.estimatedPurchaseValue)}</td><td className="p-3"><div className="flex max-w-64 flex-wrap gap-1">{row.flags.length ? row.flags.map((flag) => <span key={flag} className="rounded-full bg-neutral-100 px-2 py-1 text-[10px] font-bold">{flag.replaceAll("_", " ")}</span>) : <span className="text-neutral-400">No exceptions</span>}</div></td></tr>)}{!visibleRows.length ? <tr><td colSpan={7} className="p-10 text-center font-bold text-neutral-400">No matching recommendations.</td></tr> : null}</tbody></table></div></section>

      <div className="space-y-6"><section className="rounded-3xl border bg-white p-5"><h2 className="text-lg font-black text-[#173044]">Supplier purchase plan</h2><div className="mt-4 space-y-3">{report.suppliers.map((supplier) => <article key={supplier.supplierId ?? "unassigned"} className="rounded-2xl bg-neutral-50 p-4"><div className="flex justify-between gap-3"><div><p className="font-black">{supplier.supplierName}</p><p className="text-xs text-neutral-500">{supplier.items} items · {supplier.criticalItems} critical</p></div><p className="font-black text-[#C8102E]">{money.format(supplier.estimatedValue)}</p></div></article>)}{!report.suppliers.length ? <p className="py-6 text-center text-sm font-bold text-neutral-400">No purchases recommended.</p> : null}</div></section><section className="rounded-3xl border bg-white p-5"><h2 className="text-lg font-black text-[#173044]">Risk exposure</h2><div className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><span>Near-expiry tracked value</span><strong>{money.format(report.kpis.nearExpiryTrackedValue)}</strong></div><div className="flex justify-between"><span>30-day wastage</span><strong>{money.format(report.kpis.wastage30Value)}</strong></div><div className="flex justify-between"><span>Gross buying requirement</span><strong>{money.format(report.kpis.grossRecommendedValue)}</strong></div></div></section></div></div>
    </> : null}
  </div>;
}
