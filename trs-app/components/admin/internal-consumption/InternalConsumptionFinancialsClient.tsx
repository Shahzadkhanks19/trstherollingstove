"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRotateRight, faDownload, faPrint } from "@fortawesome/free-solid-svg-icons";
import { PageHeader, SectionCard } from "@/components/admin/AdminPrimitives";

type Report = {
  generatedAt: string;
  range: { from: string; to: string };
  kpis: {
    grossSales: number;
    netRevenue: number;
    taxCollected: number;
    customerCogs: number;
    grossProfit: number;
    operatingExpenses: number;
    internalConsumptionCost: number;
    adjustedOperatingProfit: number;
    grossMarginPercent: number;
    foodCostPercent: number;
    internalConsumptionPercent: number;
    orderCount: number;
    averageOrderValue: number;
  };
  discounts: Record<"manual" | "coupons" | "coins" | "itemMarkdowns" | "comboSavings" | "total", number>;
  internalConsumption: {
    menuValue: number;
    inventoryCost: number;
    costCoveragePercent: number;
    orders: number;
    byType: Array<{ saleType: string; orders: number; menuValue: number; inventoryCost: number }>;
  };
  gst: { taxableRevenue: number; outputTax: number; inputTax: number; netTaxPayable: number; effectiveTaxRatePercent: number };
  revenueTrend: Array<{ date: string; grossSales: number; netRevenue: number; tax: number; cogs: number; grossProfit: number }>;
  expenseBreakdown: Array<{ category: string; amount: number; tax: number; count: number }>;
  profitAndLoss: Array<{ key: string; label: string; amount: number; kind: "income" | "expense" | "subtotal" }>;
  dataQuality: { customerOrdersWithoutCost: number; internalOrdersWithoutCost: number; costCoveragePercent: number };
};

type ApiResponse = { data?: Report; message?: string };
type Tab = "profit" | "revenue" | "cost" | "discounts" | "gst";

const money = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function isoDate(date: Date): string {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 10);
}

function Metric({ title, value, detail }: { title: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-[.12em] text-slate-500">{title}</p><p className="mt-3 text-3xl font-black text-[#173044]">{value}</p><p className="mt-2 text-xs font-bold text-slate-500">{detail}</p></div>;
}

function Bars({ rows }: { rows: Array<{ key: string; title: string; value: number; detail: string }> }) {
  const max = Math.max(0, ...rows.map((row) => Math.abs(row.value)));
  return <div className="space-y-4">{rows.map((row) => <div key={row.key}><div className="mb-2 flex justify-between gap-4"><div><p className="text-sm font-black text-[#173044]">{row.title}</p><p className="text-xs text-slate-500">{row.detail}</p></div><p className="shrink-0 text-sm font-black text-[#C8102E]">{money(row.value)}</p></div><div className="h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#C8102E]" style={{ width: `${max ? Math.max(2, Math.abs(row.value) / max * 100) : 0}%` }} /></div></div>)}</div>;
}

export function InternalConsumptionFinancialsClient() {
  const today = useMemo(() => new Date(), []);
  const monthStart = useMemo(() => { const date = new Date(); date.setDate(1); return date; }, []);
  const [from, setFrom] = useState(isoDate(monthStart));
  const [to, setTo] = useState(isoDate(today));
  const [tab, setTab] = useState<Tab>("profit");
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const query = useMemo(() => new URLSearchParams({ from, to }).toString(), [from, to]);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/admin/internal-consumption/financials?${query}`, { cache: "no-store" });
      const payload = await response.json() as ApiResponse;
      if (!response.ok || !payload.data) throw new Error(payload.message || "Unable to load financial report.");
      setReport(payload.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load financial report.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const tabs: Array<{ key: Tab; title: string }> = [
    { key: "profit", title: "Profit & Loss" },
    { key: "revenue", title: "Revenue" },
    { key: "cost", title: "Food & Internal Cost" },
    { key: "discounts", title: "Discounts" },
    { key: "gst", title: "GST" },
  ];

  return <div className="space-y-6 print:bg-white">
    <PageHeader
      eyebrow="Phase 4.2.2"
      title="Financial Statements & Cost Intelligence"
      description="Revenue, food cost, internal consumption, discounts, expenses and GST in one auditable financial reporting workspace."
      actions={<div className="flex flex-wrap gap-2 print:hidden">{(["csv", "xlsx", "pdf"] as const).map((format) => <a key={format} href={`/api/v1/admin/internal-consumption/financials?${query}&format=${format}`} className="rounded-xl border bg-white px-4 py-2 text-xs font-black uppercase text-[#173044]"><FontAwesomeIcon icon={faDownload} className="mr-2" />{format}</a>)}<button type="button" onClick={() => window.print()} className="rounded-xl border bg-white px-4 py-2 text-xs font-black text-[#173044]"><FontAwesomeIcon icon={faPrint} className="mr-2" />Print</button><button type="button" onClick={() => void load()} className="rounded-xl bg-[#173044] px-4 py-2 text-xs font-black text-white"><FontAwesomeIcon icon={faArrowRotateRight} className="mr-2" />Refresh</button></div>}
    />

    <SectionCard className="print:hidden"><div className="flex flex-wrap items-end gap-4"><label className="text-xs font-black text-slate-600">From<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-2 block h-11 rounded-xl border border-slate-200 px-3" /></label><label className="text-xs font-black text-slate-600">To<input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} className="mt-2 block h-11 rounded-xl border border-slate-200 px-3" /></label><button type="button" onClick={() => void load()} className="h-11 rounded-xl bg-[#C8102E] px-5 text-xs font-black text-white">Apply date range</button></div></SectionCard>

    {error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div> : null}
    {loading ? <SectionCard><p className="py-16 text-center text-sm font-bold text-slate-500">Calculating financial statements…</p></SectionCard> : null}

    {report ? <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="Net Revenue" value={money(report.kpis.netRevenue)} detail={`${report.kpis.orderCount} customer orders`} />
        <Metric title="Gross Profit" value={money(report.kpis.grossProfit)} detail={`${report.kpis.grossMarginPercent}% gross margin`} />
        <Metric title="Adjusted Operating Profit" value={money(report.kpis.adjustedOperatingProfit)} detail="After expenses and internal consumption" />
        <Metric title="Food Cost" value={`${report.kpis.foodCostPercent}%`} detail={`${money(report.kpis.customerCogs)} customer COGS`} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 print:hidden">{tabs.map((item) => <button key={item.key} type="button" onClick={() => setTab(item.key)} className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-black ${tab === item.key ? "bg-[#173044] text-white" : "border border-slate-200 bg-white text-[#173044]"}`}>{item.title}</button>)}</div>

      {tab === "profit" ? <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]"><SectionCard><h2 className="text-lg font-black text-[#173044]">Profit & Loss Statement</h2><div className="mt-5 divide-y divide-slate-100">{report.profitAndLoss.map((row) => <div key={row.key} className={`flex items-center justify-between gap-4 py-4 ${row.kind === "subtotal" ? "text-base font-black text-[#173044]" : "text-sm"}`}><span>{row.label}</span><span className={row.amount < 0 ? "font-black text-red-600" : "font-black"}>{money(row.amount)}</span></div>)}</div></SectionCard><SectionCard><h2 className="text-lg font-black text-[#173044]">Reporting Integrity</h2><div className="mt-5 space-y-4"><Metric title="Inventory Cost Coverage" value={`${report.dataQuality.costCoveragePercent}%`} detail="Customer and internal orders with cost movements" /><p className="text-sm font-bold text-slate-600">Customer orders without cost: {report.dataQuality.customerOrdersWithoutCost}</p><p className="text-sm font-bold text-slate-600">Internal orders without cost: {report.dataQuality.internalOrdersWithoutCost}</p></div></SectionCard></div> : null}

      {tab === "revenue" ? <div className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]"><SectionCard><h2 className="text-lg font-black text-[#173044]">Daily Revenue & Gross Profit</h2><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr className="border-b text-xs uppercase tracking-wide text-slate-500"><th className="py-3">Date</th><th>Gross Sales</th><th>Net Revenue</th><th>GST</th><th>COGS</th><th>Gross Profit</th></tr></thead><tbody>{report.revenueTrend.map((row) => <tr key={row.date} className="border-b border-slate-100"><td className="py-3 font-bold">{row.date}</td><td>{money(row.grossSales)}</td><td>{money(row.netRevenue)}</td><td>{money(row.tax)}</td><td>{money(row.cogs)}</td><td className="font-black">{money(row.grossProfit)}</td></tr>)}</tbody></table></div></SectionCard><SectionCard><h2 className="text-lg font-black text-[#173044]">Revenue KPIs</h2><div className="mt-5 space-y-5"><Metric title="Gross Sales" value={money(report.kpis.grossSales)} detail="Before GST and order discounts" /><Metric title="Average Order Value" value={money(report.kpis.averageOrderValue)} detail="Net revenue per customer order" /><Metric title="GST Collected" value={money(report.kpis.taxCollected)} detail={`${report.gst.effectiveTaxRatePercent}% effective rate`} /></div></SectionCard></div> : null}

      {tab === "cost" ? <div className="grid gap-6 xl:grid-cols-2"><SectionCard><h2 className="text-lg font-black text-[#173044]">Internal Consumption Cost</h2><div className="mt-5"><Bars rows={report.internalConsumption.byType.map((row) => ({ key: row.saleType, title: label(row.saleType), value: row.inventoryCost, detail: `${row.orders} orders · ${money(row.menuValue)} menu value` }))} /></div></SectionCard><SectionCard><h2 className="text-lg font-black text-[#173044]">Approved Expense Breakdown</h2><div className="mt-5"><Bars rows={report.expenseBreakdown.map((row) => ({ key: row.category, title: label(row.category), value: row.amount, detail: `${row.count} entries · ${money(row.tax)} input GST` }))} /></div></SectionCard></div> : null}

      {tab === "discounts" ? <div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1"><Metric title="Total Commercial Discount Impact" value={money(report.discounts.total)} detail="Manual, coupon, coin, item and combo savings" /><Metric title="Coupon Cost" value={money(report.discounts.coupons)} detail="Coupon-funded reductions" /><Metric title="TRS Coin Redemption" value={money(report.discounts.coins)} detail="Loyalty liability consumed" /></div><SectionCard><h2 className="text-lg font-black text-[#173044]">Discount Mix</h2><div className="mt-5"><Bars rows={(Object.entries(report.discounts) as Array<[string, number]>).filter(([key]) => key !== "total").map(([key, value]) => ({ key, title: label(key), value, detail: report.discounts.total ? `${(value / report.discounts.total * 100).toFixed(1)}% of tracked discount impact` : "No discount impact" }))} /></div></SectionCard></div> : null}

      {tab === "gst" ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric title="Taxable Revenue" value={money(report.gst.taxableRevenue)} detail="Net revenue excluding GST" /><Metric title="Output GST" value={money(report.gst.outputTax)} detail="Collected from customer orders" /><Metric title="Input GST" value={money(report.gst.inputTax)} detail="From approved expense records" /><Metric title="Net GST Payable" value={money(report.gst.netTaxPayable)} detail="Output tax less eligible tracked input tax" /></div> : null}
    </> : null}
  </div>;
}
