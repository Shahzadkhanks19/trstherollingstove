"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRotateRight,
  faDownload,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { PageHeader, SectionCard } from "@/components/admin/AdminPrimitives";
import type { ExecutiveBIIntelligenceResult } from "@/services/executive-bi-intelligence.service";

type Envelope<T> = { data?: T; message?: string; error?: string };
type Preset = "today" | "week" | "month" | "quarter" | "year";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const payload = await response.json() as Envelope<T>;
  if (!response.ok || !payload.data) throw new Error(payload.message ?? payload.error ?? "Request failed.");
  return payload.data;
}

function Metric({ label, value, detail, change }: { label: string; value: string; detail: string; change?: number }) {
  return <article className="rounded-3xl border bg-white p-5 shadow-sm">
    <p className="text-xs font-black uppercase tracking-[.12em] text-slate-400">{label}</p>
    <p className="mt-3 text-3xl font-black text-[#173044]">{value}</p>
    {change !== undefined ? <p className={`mt-1 text-xs font-black ${change >= 0 ? "text-emerald-700" : "text-red-600"}`}>{change >= 0 ? "+" : ""}{change}% vs previous</p> : null}
    <p className="mt-2 text-xs font-bold text-slate-500">{detail}</p>
  </article>;
}

function Score({ label, value }: { label: string; value: number }) {
  const bounded = Math.max(0, Math.min(100, value));
  return <article className="rounded-2xl border bg-white p-5">
    <div className="flex items-center justify-between gap-4"><p className="font-black text-[#173044]">{label}</p><p className="text-lg font-black">{bounded.toFixed(1)}</p></div>
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#173044]" style={{ width: `${bounded}%` }} /></div>
  </article>;
}

function severityClass(severity: string) {
  if (severity === "critical") return "border-red-300 bg-red-50 text-red-800";
  if (severity === "high") return "border-orange-300 bg-orange-50 text-orange-800";
  if (severity === "medium") return "border-amber-300 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export function ExecutiveBIDashboardClient() {
  const [report, setReport] = useState<ExecutiveBIIntelligenceResult | null>(null);
  const [preset, setPreset] = useState<Preset>("month");
  const [lookbackDays, setLookbackDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const query = useMemo(() => new URLSearchParams({ lookbackDays: String(lookbackDays) }).toString(), [lookbackDays]);
  const load = useCallback(async (refresh = false) => {
    setLoading(true); setError("");
    try {
      setReport(await api<ExecutiveBIIntelligenceResult>(`/api/v1/admin/executive-bi/intelligence?${query}${refresh ? "&refresh=true" : ""}`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load executive intelligence.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function generate() {
    setWorking(true); setError(""); setNotice("");
    try {
      await api<{ runId: string }>("/api/v1/admin/executive-bi/run", {
        method: "POST",
        body: JSON.stringify({ periodPreset: preset, carryingCostAnnualPercent: 20, deadStockDays: 60, source: "manual" }),
      });
      setNotice("Executive BI and supporting intelligence refreshed.");
      await load(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to generate executive intelligence.");
    } finally {
      setWorking(false);
    }
  }

  const snapshot = report?.executive.snapshot;
  const maxTrendRevenue = Math.max(0, ...(report?.actualVsForecast.map((row) => row.revenue) ?? []));
  const topProcurement = report?.procurement.recommendations.slice(0, 8) ?? [];

  return <div className="space-y-6 print:bg-white">
    <PageHeader
      eyebrow="Phase 4.2.5 · Batch 4"
      title="Unified Executive Business Intelligence"
      description="Revenue, profitability, forecast, procurement, inventory health, internal consumption and executive exceptions in one owner-level workspace."
      action={<div className="flex flex-wrap gap-2 print:hidden">
        {(["csv", "xlsx", "pdf"] as const).map((format) => <a key={format} href={`/api/v1/admin/executive-bi/intelligence?${query}&format=${format}`} className="rounded-xl border bg-white px-4 py-2 text-xs font-black uppercase"><FontAwesomeIcon icon={faDownload} className="mr-2" />{format}</a>)}
        <button type="button" onClick={() => window.print()} className="rounded-xl border bg-white px-4 py-2 text-xs font-black">Print</button>
        <button type="button" onClick={() => void load(true)} disabled={loading} className="rounded-xl bg-[#173044] px-4 py-2 text-xs font-black text-white disabled:opacity-50"><FontAwesomeIcon icon={faArrowRotateRight} className="mr-2" />Refresh intelligence</button>
      </div>}
    />

    <SectionCard title="Executive controls" subtitle="Generate the established Executive BI report and choose the comparable intelligence window.">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-black text-slate-600">Executive period<select value={preset} onChange={(event) => setPreset(event.target.value as Preset)} className="mt-2 block h-11 rounded-xl border bg-white px-3"><option value="today">Today</option><option value="week">Last 7 days</option><option value="month">This month</option><option value="quarter">This quarter</option><option value="year">This year</option></select></label>
        <label className="text-xs font-black text-slate-600">KPI lookback<select value={lookbackDays} onChange={(event) => setLookbackDays(Number(event.target.value))} className="mt-2 block h-11 rounded-xl border bg-white px-3">{[14, 30, 60, 90, 180].map((days) => <option key={days} value={days}>{days} days</option>)}</select></label>
        <button type="button" disabled={working} onClick={() => void generate()} className="h-11 rounded-xl bg-[#C8102E] px-5 text-xs font-black text-white disabled:opacity-50">{working ? "Generating…" : "Generate complete report"}</button>
      </div>
    </SectionCard>

    {error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">{error}</div> : null}
    {notice ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-700">{notice}</div> : null}
    {loading ? <SectionCard title="Loading executive intelligence"><p className="py-16 text-center font-bold text-slate-400">Consolidating financial, forecast and procurement intelligence…</p></SectionCard> : null}

    {report && !loading ? <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Current revenue" value={money.format(report.summary.currentRevenue)} change={report.summary.revenueChangePercent} detail={`${report.kpi.kpis.orders} customer orders`} />
        <Metric label="30-day revenue forecast" value={money.format(report.summary.forecast30Revenue)} detail={`Range ${money.format(report.forecast.horizons[1].lowerRevenue)}–${money.format(report.forecast.horizons[1].upperRevenue)}`} />
        <Metric label="30-day food-cost forecast" value={money.format(report.summary.forecast30FoodCost)} detail={`${report.kpi.kpis.foodCostPercent}% current tracked food cost`} />
        <Metric label="Procurement exposure" value={money.format(report.procurement.kpis.netRecommendedValue)} detail={`${report.summary.criticalProcurementItems} critical/high-risk items`} />
        <Metric label="Average order value" value={money.format(report.kpi.kpis.averageOrderValue)} change={report.kpi.kpis.averageOrderValueChange} detail={`${report.kpi.kpis.discountPercent}% discount rate`} />
        <Metric label="Internal consumption" value={money.format(report.kpi.kpis.internalValue)} detail={`${report.kpi.kpis.internalPercent}% of revenue`} />
        <Metric label="Wastage" value={money.format(report.kpi.kpis.wastageValue)} detail={`${report.kpi.kpis.wastagePercent}% of revenue`} />
        <Metric label="Open executive alerts" value={String(report.summary.totalAlerts)} detail={`${report.summary.criticalAlerts} critical alerts`} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Score label="Business health" value={Number(snapshot?.businessHealthScore ?? 0)} />
        <Score label="Inventory health" value={report.summary.inventoryHealthScore} />
        <Score label="Forecast confidence" value={report.summary.forecastQualityScore} />
        <Score label="Procurement efficiency" value={Number(snapshot?.procurementEfficiencyScore ?? 0)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <SectionCard title="Actual vs forecast revenue" subtitle="Latest 14 actual days followed by the next 14 forecast days.">
          <div className="overflow-x-auto pb-2"><div className="flex h-72 min-w-[820px] items-end gap-2">{report.actualVsForecast.map((row) => <div key={`${row.kind}-${row.date}`} className="flex min-w-5 flex-1 flex-col items-center justify-end"><div title={`${row.date}: ${money.format(row.revenue)}`} className={`w-full max-w-8 rounded-t ${row.kind === "actual" ? "bg-[#173044]" : "bg-[#C8102E]"}`} style={{ height: `${maxTrendRevenue ? Math.max(3, row.revenue / maxTrendRevenue * 220) : 0}px` }} /><span className="mt-2 text-[9px] font-bold text-slate-400">{row.date.slice(5)}</span></div>)}</div></div>
          <div className="mt-3 flex gap-4 text-xs font-bold"><span><span className="mr-2 inline-block h-2 w-4 rounded bg-[#173044]" />Actual</span><span><span className="mr-2 inline-block h-2 w-4 rounded bg-[#C8102E]" />Forecast</span></div>
        </SectionCard>
        <SectionCard title="Executive summary"><div className="space-y-3">{report.kpi.executiveSummary.map((item) => <p key={item} className="rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-700">{item}</p>)}<p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">Forecast quality: {report.forecast.quality.message}</p></div></SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <SectionCard title="Unified exception center" subtitle="Financial, operational, forecast and procurement exceptions ordered by severity.">
          <div className="space-y-3">{report.alerts.slice(0, 14).map((alert) => <article key={`${alert.source}-${alert.code}`} className={`rounded-2xl border p-4 ${severityClass(alert.severity)}`}><p className="font-black"><FontAwesomeIcon icon={faTriangleExclamation} className="mr-2" />{alert.title}</p><p className="mt-1 text-[10px] font-black uppercase tracking-widest opacity-70">{alert.source} · {alert.severity}</p><p className="mt-2 text-sm">{alert.message}</p><p className="mt-2 text-xs font-bold">Action: {alert.suggestedAction}</p></article>)}{!report.alerts.length ? <p className="py-10 text-center font-bold text-emerald-700">No major exceptions detected.</p> : null}</div>
        </SectionCard>
        <SectionCard title="Priority procurement plan" subtitle="Highest-risk ingredients and recommended net purchase quantities.">
          <div className="space-y-3">{topProcurement.map((row) => <article key={row.inventoryItemId} className="rounded-2xl border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-[#173044]">{row.itemName}</p><p className="text-xs text-slate-500">{row.category} · {row.unit}</p></div><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${severityClass(row.priority)}`}>{row.priority}</span></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><p>Order: <strong>{row.netRecommendedQuantity.toFixed(2)} {row.unit}</strong></p><p>Value: <strong>{money.format(row.estimatedPurchaseValue)}</strong></p><p>Stockout: <strong>{row.expectedStockoutDate ?? "Not projected"}</strong></p><p>Purchase by: <strong>{row.recommendedPurchaseDate}</strong></p></div></article>)}{!topProcurement.length ? <p className="py-10 text-center font-bold text-slate-400">No procurement recommendations.</p> : null}</div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard title="Weekday revenue ranking"><div className="space-y-3">{[...report.kpi.weekdayPerformance].sort((a, b) => b.revenue - a.revenue).map((row) => <div key={row.weekday} className="flex justify-between rounded-xl border p-3"><div><p className="font-black">{row.weekday}</p><p className="text-xs text-slate-500">{row.orders} orders</p></div><p className="font-black text-[#C8102E]">{money.format(row.revenue)}</p></div>)}</div></SectionCard>
        <SectionCard title="Procurement by supplier"><div className="space-y-3">{report.procurement.suppliers.slice(0, 7).map((row) => <div key={`${row.supplierId}-${row.supplierName}`} className="flex justify-between rounded-xl border p-3"><div><p className="font-black">{row.supplierName}</p><p className="text-xs text-slate-500">{row.items} items · {row.criticalItems} critical</p></div><p className="font-black text-[#C8102E]">{money.format(row.estimatedValue)}</p></div>)}</div></SectionCard>
        <SectionCard title="Financial control snapshot"><div className="space-y-3">{[
          ["Gross profit", money.format(Number(snapshot?.grossProfit ?? 0))],
          ["Gross margin", `${Number(snapshot?.grossMarginPercent ?? 0).toFixed(1)}%`],
          ["Inventory value", money.format(Number(snapshot?.inventoryValue ?? 0))],
          ["Dead stock", money.format(Number(snapshot?.deadStockCost ?? 0))],
          ["Overstock", money.format(Number(snapshot?.overstockCost ?? 0))],
          ["Forecast reorder", money.format(report.procurement.kpis.netRecommendedValue)],
        ].map(([label, value]) => <div key={label} className="flex justify-between rounded-xl bg-slate-50 p-3 text-sm"><span className="font-bold text-slate-600">{label}</span><span className="font-black text-[#173044]">{value}</span></div>)}</div></SectionCard>
      </div>
    </> : null}
  </div>;
}
