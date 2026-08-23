"use client";
import { financeApi } from "@/lib/api/finance-client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRotateRight, faChartLine, faDownload, faMoneyBillTrendUp, faScaleBalanced, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { PageHeader, StatCard } from "@/components/admin/AdminPrimitives";

type Scenario = "base" | "optimistic" | "conservative";
type DashboardData = {
  metrics: {
    grossRevenue: number; netRevenue: number; operatingExpenses: number; netProfit: number; profitMargin: number;
    cashInflows: number; cashOutflows: number; netCashFlow: number; accountsReceivable: number; accountsPayable: number;
    workingCapital: number; netTaxPayable: number; forecastRevenue: number; forecastExpenses: number; forecastProfit: number;
    projectedCashBalance: number; cashRunwayMonths: number; forecastAccuracy: number; currentRatio: number; receivableToPayableRatio: number;
  };
  alerts: Array<{ severity: string; title: string; message: string; value: number }>;
  trend: Array<{ date: string; revenue: number; expenses: number; profit: number }>;
};



const money = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

export function ExecutiveFinanceClient() {
  const [days, setDays] = useState(30);
  const [fiscalYear] = useState(new Date().getUTCFullYear());
  const [scenario, setScenario] = useState<Scenario>("base");
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const load = useCallback(async () => {
    try {
      setError("");
      setData(await financeApi<DashboardData>(`/api/v1/admin/finance/executive-finance/summary?days=${days}&fiscalYear=${fiscalYear}&scenario=${scenario}`));
    } catch (value) { setError(value instanceof Error ? value.message : "Unable to load executive finance dashboard."); }
  }, [days, fiscalYear, scenario]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  async function rebuild() {
    setWorking(true);
    try {
      await financeApi("/api/v1/admin/finance/executive-finance/rebuild", { method: "POST", body: JSON.stringify({ days, fiscalYear, scenario, source: "manual" }) });
      await load();
    } catch (value) { setError(value instanceof Error ? value.message : "Rebuild failed."); }
    finally { setWorking(false); }
  }
  const m = data?.metrics;
  return <>
    <PageHeader eyebrow="Phase 8 · Financial Management" title="Executive Financial Dashboard" description="CFO-level view of profitability, liquidity, working capital, tax exposure, budget outlook and financial risks." action={<div className="flex flex-wrap gap-2">
      <select value={days} onChange={(event) => setDays(Number(event.target.value))} className="rounded-xl border bg-white px-4 py-3 text-xs font-black"><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option><option value={365}>365 days</option></select>
      <select value={scenario} onChange={(event) => setScenario(event.target.value as Scenario)} className="rounded-xl border bg-white px-4 py-3 text-xs font-black"><option value="base">Base</option><option value="optimistic">Optimistic</option><option value="conservative">Conservative</option></select>
      <Link href={`/api/v1/admin/finance/executive-finance/report?days=${days}&fiscalYear=${fiscalYear}&scenario=${scenario}`} prefetch={false} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-xs font-black"><FontAwesomeIcon icon={faDownload}/>Export CSV</Link>
      <button disabled={working} onClick={() => void rebuild()} className="inline-flex items-center gap-2 rounded-xl bg-[#173044] px-4 py-3 text-xs font-black text-white"><FontAwesomeIcon icon={faArrowRotateRight}/>{working ? "Rebuilding…" : "Rebuild"}</button>
    </div>}/>
    {error ? <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p> : null}
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Net revenue" value={money(m?.netRevenue ?? 0)} icon={faMoneyBillTrendUp} detail={`${money(m?.grossRevenue ?? 0)} gross`}/>
      <StatCard label="Net profit" value={money(m?.netProfit ?? 0)} icon={faChartLine} detail={`${m?.profitMargin ?? 0}% margin`}/>
      <StatCard label="Net cash flow" value={money(m?.netCashFlow ?? 0)} icon={faScaleBalanced} detail={`${money(m?.workingCapital ?? 0)} working capital`}/>
      <StatCard label="Forecast profit" value={money(m?.forecastProfit ?? 0)} icon={faChartLine} detail={`${m?.forecastAccuracy ?? 0}% budget alignment`}/>
    </div>
    <section className="mt-6 grid gap-4 lg:grid-cols-3">
      <div className="rounded-2xl border bg-white p-5 lg:col-span-2"><h2 className="text-lg font-black">Executive ratios</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-black uppercase text-slate-500">Current ratio</p><p className="mt-2 text-2xl font-black">{m?.currentRatio === 999 ? "No liabilities" : m?.currentRatio ?? 0}</p></div>
        <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-black uppercase text-slate-500">AR / AP ratio</p><p className="mt-2 text-2xl font-black">{m?.receivableToPayableRatio === 999 ? "No payables" : m?.receivableToPayableRatio ?? 0}</p></div>
        <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-black uppercase text-slate-500">Projected cash</p><p className="mt-2 text-2xl font-black">{money(m?.projectedCashBalance ?? 0)}</p></div>
        <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-black uppercase text-slate-500">Cash runway</p><p className="mt-2 text-2xl font-black">{m?.cashRunwayMonths === 999 ? "No burn" : `${m?.cashRunwayMonths ?? 0} months`}</p></div>
      </div></div>
      <div className="rounded-2xl border bg-white p-5"><h2 className="text-lg font-black">Finance alerts</h2><div className="mt-4 space-y-3">{(data?.alerts ?? []).map((alert, index) => <div key={`${alert.title}-${index}`} className="rounded-xl border p-3"><div className="flex items-center gap-2"><FontAwesomeIcon icon={faTriangleExclamation}/><span className="text-xs font-black uppercase">{alert.severity}</span></div><p className="mt-2 font-black">{alert.title}</p><p className="mt-1 text-xs text-slate-500">{alert.message}</p></div>)}</div></div>
    </section>
    <section className="mt-6 overflow-hidden rounded-2xl border bg-white"><div className="border-b p-5"><h2 className="text-lg font-black">Financial trend</h2></div><div className="overflow-x-auto"><table className="min-w-[720px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Date</th><th className="p-3">Revenue</th><th className="p-3">Expenses</th><th className="p-3">Profit</th></tr></thead><tbody>{(data?.trend ?? []).map((row) => <tr key={row.date} className="border-t"><td className="p-3 font-black">{row.date}</td><td className="p-3">{money(row.revenue)}</td><td className="p-3">{money(row.expenses)}</td><td className="p-3 font-black">{money(row.profit)}</td></tr>)}</tbody></table></div></section>
  </>;
}
