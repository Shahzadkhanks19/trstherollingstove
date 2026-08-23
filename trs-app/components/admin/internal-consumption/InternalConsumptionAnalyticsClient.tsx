"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRotateRight, faDownload } from "@fortawesome/free-solid-svg-icons";
import { PageHeader, SectionCard } from "@/components/admin/AdminPrimitives";

type SaleType = "staff_meal" | "family_meal" | "complimentary" | "food_wastage" | "kitchen_test";
type Report = {
  range: { from: string; to: string; saleType: "all" | SaleType };
  totals: { orders: number; menuValue: number; items: number; averageOrderValue: number; uniquePeople: number; inventoryCost: number; costCoveragePercent: number };
  byType: Array<{ saleType: SaleType; orders: number; menuValue: number; inventoryCost: number; items: number }>;
  dailyTrend: Array<{ date: string; orders: number; menuValue: number; inventoryCost: number; items: number }>;
  topPeople: Array<{ name: string; saleType: SaleType; orders: number; menuValue: number; inventoryCost: number }>;
  topItems: Array<{ name: string; variantName: string; quantity: number; menuValue: number }>;
  topReasons: Array<{ reason: string; saleType: SaleType; orders: number; menuValue: number }>;
};

const labels: Record<SaleType, string> = {
  staff_meal: "Staff Meals",
  family_meal: "Family Meals",
  complimentary: "Complimentary",
  food_wastage: "Food Wastage",
  kitchen_test: "Kitchen Testing",
};

function localDate(value: Date): string {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
}

function currency(value: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);
}

function MetricCard({ label, value, detail, strong = false }: { label: string; value: string; detail: string; strong?: boolean }) {
  return <article className={`rounded-[24px] border p-5 ${strong ? "border-[#173044] bg-[#173044] text-white" : "bg-white text-[#173044]"}`}>
    <p className={`text-xs font-black uppercase tracking-widest ${strong ? "text-white/60" : "text-slate-400"}`}>{label}</p>
    <p className="mt-3 text-2xl font-black">{value}</p>
    <p className={`mt-1 text-xs font-bold ${strong ? "text-[#E8A53A]" : "text-slate-500"}`}>{detail}</p>
  </article>;
}

function Bar({ value, max }: { value: number; max: number }) {
  return <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#C8102E]" style={{ width: `${max > 0 ? Math.max(4, value / max * 100) : 0}%` }} /></div>;
}

export function InternalConsumptionAnalyticsClient() {
  const today = useMemo(() => new Date(), []);
  const initialFrom = useMemo(() => { const value = new Date(today); value.setDate(value.getDate() - 29); return localDate(value); }, [today]);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(localDate(today));
  const [saleType, setSaleType] = useState<"all" | SaleType>("all");
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const query = useMemo(() => new URLSearchParams({ from, to, saleType }).toString(), [from, to, saleType]);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/v1/admin/internal-consumption/analytics?${query}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to load analytics.");
      setReport(payload.data as Report);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const maxDailyValue = Math.max(0, ...(report?.dailyTrend.map((row) => row.menuValue) ?? []));
  const maxTypeValue = Math.max(0, ...(report?.byType.map((row) => row.menuValue) ?? []));

  return <div className="space-y-6">
    <PageHeader
      eyebrow="Business intelligence"
      title="Internal Consumption Analytics"
      description="Measure staff meals, family meals, complimentary orders, kitchen testing and wastage without mixing them into revenue."
      actions={<div className="flex flex-wrap gap-2">{(["csv","xlsx","pdf"] as const).map((format)=><a key={format} href={`/api/v1/admin/internal-consumption/analytics?${query}&format=${format}`} className="rounded-xl border bg-white px-4 py-2 text-xs font-black uppercase text-[#173044]"><FontAwesomeIcon icon={faDownload} className="mr-2" />{format}</a>)}<button onClick={() => void load()} className="rounded-xl bg-[#173044] px-4 py-2 text-xs font-black text-white"><FontAwesomeIcon icon={faArrowRotateRight} className="mr-2" />Refresh</button></div>}
    />

    <SectionCard>
      <div className="grid gap-4 md:grid-cols-4 md:items-end">
        <label className="text-xs font-black text-[#173044]">From<input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} className="mt-2 h-11 w-full rounded-xl border px-3" /></label>
        <label className="text-xs font-black text-[#173044]">To<input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} className="mt-2 h-11 w-full rounded-xl border px-3" /></label>
        <label className="text-xs font-black text-[#173044]">Order type<select value={saleType} onChange={(event) => setSaleType(event.target.value as "all" | SaleType)} className="mt-2 h-11 w-full rounded-xl border bg-white px-3"><option value="all">All internal orders</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button onClick={() => void load()} disabled={loading} className="h-11 rounded-xl bg-[#C8102E] px-5 text-xs font-black text-white disabled:opacity-50">Apply filters</button>
      </div>
    </SectionCard>

    {error ? <p className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p> : null}
    {loading ? <SectionCard><p className="py-12 text-center font-bold text-slate-400">Loading analytics…</p></SectionCard> : null}

    {!loading && report ? <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard strong label="Menu value consumed" value={currency(report.totals.menuValue)} detail="Excluded from sales revenue" />
        <MetricCard label="Internal orders" value={String(report.totals.orders)} detail={`${report.totals.items} total items`} />
        <MetricCard label="Average value" value={currency(report.totals.averageOrderValue)} detail="Per internal order" />
        <MetricCard label="People served" value={String(report.totals.uniquePeople)} detail="Unique recorded names" />
        <MetricCard label="Inventory cost" value={currency(report.totals.inventoryCost)} detail={`${report.totals.costCoveragePercent}% of menu value`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard><h2 className="text-lg font-black text-[#173044]">Cost by category</h2><p className="mt-1 text-sm text-slate-500">Menu value assigned to each internal order type.</p><div className="mt-5 space-y-4">{report.byType.length ? report.byType.map((row) => <div key={row.saleType}><div className="mb-2 flex items-center justify-between gap-3"><div><p className="text-sm font-black text-[#173044]">{labels[row.saleType]}</p><p className="text-xs text-slate-500">{row.orders} orders · {row.items} items</p></div><p className="text-sm font-black text-[#C8102E]">{currency(row.menuValue)}</p></div><Bar value={row.menuValue} max={maxTypeValue} /></div>) : <p className="py-8 text-center text-sm font-bold text-slate-400">No internal orders in this period.</p>}</div></SectionCard>
        <SectionCard><h2 className="text-lg font-black text-[#173044]">Daily trend</h2><p className="mt-1 text-sm text-slate-500">Operational consumption over the selected range.</p><div className="mt-5 max-h-96 space-y-3 overflow-y-auto pr-1">{report.dailyTrend.length ? report.dailyTrend.map((row) => <div key={row.date} className="grid grid-cols-[90px_1fr_auto] items-center gap-3"><p className="text-xs font-black text-slate-500">{row.date.slice(5)}</p><Bar value={row.menuValue} max={maxDailyValue} /><div className="text-right"><p className="text-xs font-black text-[#173044]">{currency(row.menuValue)}</p><p className="text-[10px] text-slate-400">{row.orders} orders</p></div></div>) : <p className="py-8 text-center text-sm font-bold text-slate-400">No daily activity.</p>}</div></SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <SectionCard><h2 className="text-lg font-black text-[#173044]">Top people</h2><div className="mt-4 divide-y">{report.topPeople.map((row, index) => <div key={`${row.saleType}-${row.name}`} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-black text-[#173044]">{index + 1}. {row.name}</p><p className="text-xs text-slate-500">{labels[row.saleType]} · {row.orders} orders</p></div><p className="shrink-0 text-xs font-black text-[#C8102E]">{currency(row.menuValue)}</p></div>)}{!report.topPeople.length ? <p className="py-8 text-center text-sm font-bold text-slate-400">No people data.</p> : null}</div></SectionCard>
        <SectionCard><h2 className="text-lg font-black text-[#173044]">Top consumed items</h2><div className="mt-4 divide-y">{report.topItems.map((row, index) => <div key={`${row.name}-${row.variantName}`} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-black text-[#173044]">{index + 1}. {row.name}</p><p className="text-xs text-slate-500">{row.variantName || "Standard"} · Qty {row.quantity}</p></div><p className="shrink-0 text-xs font-black text-[#C8102E]">{currency(row.menuValue)}</p></div>)}{!report.topItems.length ? <p className="py-8 text-center text-sm font-bold text-slate-400">No item data.</p> : null}</div></SectionCard>
        <SectionCard><h2 className="text-lg font-black text-[#173044]">Top reasons</h2><div className="mt-4 divide-y">{report.topReasons.map((row, index) => <div key={`${row.saleType}-${row.reason}`} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-black text-[#173044]">{index + 1}. {row.reason}</p><p className="text-xs text-slate-500">{labels[row.saleType]} · {row.orders} orders</p></div><p className="shrink-0 text-xs font-black text-[#C8102E]">{currency(row.menuValue)}</p></div>)}{!report.topReasons.length ? <p className="py-8 text-center text-sm font-bold text-slate-400">No reason data.</p> : null}</div></SectionCard>
      </div>
    </> : null}
  </div>;
}
