"use client";
import { financeApi } from "@/lib/api/finance-client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRotateRight, faDownload, faMoneyBillTrendUp, faReceipt, faRotateLeft, faTags } from "@fortawesome/free-solid-svg-icons";
import { PageHeader, StatCard } from "@/components/admin/AdminPrimitives";

type Row = { key: string; orders: number; grossRevenue: number; netRevenue: number; tax: number; discounts: number; refunds: number };
type Snapshot = {
  metrics: { paidOrderCount: number; grossRevenue: number; recognizedRevenue: number; taxCollected: number; discountTotal: number; refundTotal: number; averageOrderValue: number; dineInRevenue: number; takeawayRevenue: number };
  byDay: Row[];
  byPaymentMethod: Row[];
  byOrderMode: Row[];
  generatedAt: string;
};



const money = (value: number) => `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export function RevenueManagementClient() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const load = useCallback(async () => {
    try {
      setData(await financeApi<Snapshot>(`/api/v1/admin/finance/revenue/summary?days=${days}`));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load revenue management.");
    }
  }, [days]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  async function rebuild() {
    setWorking(true);
    try {
      await financeApi("/api/v1/admin/finance/revenue/rebuild", { method: "POST", body: JSON.stringify({ days, source: "manual" }) });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Revenue rebuild failed.");
    } finally {
      setWorking(false);
    }
  }
  const metrics = data?.metrics;
  return <>
    <PageHeader eyebrow="Phase 8 · Financial Management" title="Revenue Management" description="ERP-grade revenue recognition, sales performance, taxes, discounts, refunds and channel-level revenue intelligence." action={<div className="flex flex-wrap gap-2"><select value={days} onChange={(event) => setDays(Number(event.target.value))} className="rounded-xl border bg-white px-4 py-3 text-xs font-black"><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option><option value={365}>365 days</option></select><Link href={`/api/v1/admin/finance/revenue/report?days=${days}`} prefetch={false} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-xs font-black"><FontAwesomeIcon icon={faDownload}/>Export CSV</Link><button disabled={working} onClick={() => void rebuild()} className="inline-flex items-center gap-2 rounded-xl bg-[#173044] px-4 py-3 text-xs font-black text-white"><FontAwesomeIcon icon={faArrowRotateRight}/>{working ? "Rebuilding…" : "Rebuild"}</button></div>} />
    {error ? <p className="mb-4 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p> : null}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Recognized revenue" value={money(metrics?.recognizedRevenue ?? 0)} icon={faMoneyBillTrendUp} detail={`${metrics?.paidOrderCount ?? 0} paid orders`}/><StatCard label="Gross revenue" value={money(metrics?.grossRevenue ?? 0)} icon={faReceipt} detail={`AOV ${money(metrics?.averageOrderValue ?? 0)}`}/><StatCard label="Tax collected" value={money(metrics?.taxCollected ?? 0)} icon={faTags} detail={`Discounts ${money(metrics?.discountTotal ?? 0)}`}/><StatCard label="Refunds" value={money(metrics?.refundTotal ?? 0)} icon={faRotateLeft} detail="Captured and order-level refunds"/></div>
    <div className="mt-6 grid gap-6 xl:grid-cols-2"><RevenueTable title="Daily revenue" rows={data?.byDay ?? []}/><RevenueTable title="Payment methods" rows={data?.byPaymentMethod ?? []}/></div>
    <div className="mt-6 grid gap-6 xl:grid-cols-2"><RevenueTable title="Order modes" rows={data?.byOrderMode ?? []}/><section className="rounded-[24px] border bg-white p-5"><h2 className="text-lg font-black">Revenue mix</h2><div className="mt-4 space-y-4"><Mix label="Dine-in" value={metrics?.dineInRevenue ?? 0} total={metrics?.recognizedRevenue ?? 0}/><Mix label="Takeaway" value={metrics?.takeawayRevenue ?? 0} total={metrics?.recognizedRevenue ?? 0}/></div><p className="mt-5 text-xs text-neutral-500">Last generated: {data?.generatedAt ? new Date(data.generatedAt).toLocaleString("en-IN") : "Not generated"}</p></section></div>
  </>;
}

function RevenueTable({ title, rows }: { title: string; rows: Row[] }) {
  return <section className="rounded-[24px] border bg-white p-5"><h2 className="text-lg font-black">{title}</h2><div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-neutral-500"><th className="py-3">Period</th><th>Orders</th><th>Gross</th><th>Recognized</th><th>Refunds</th></tr></thead><tbody>{rows.length ? rows.map((row) => <tr key={row.key} className="border-b"><td className="py-3 font-bold capitalize">{row.key.replaceAll("_", " ")}</td><td>{row.orders}</td><td>{money(row.grossRevenue)}</td><td>{money(row.netRevenue)}</td><td>{money(row.refunds)}</td></tr>) : <tr><td colSpan={5} className="py-10 text-center text-neutral-500">No revenue data.</td></tr>}</tbody></table></div></section>;
}

function Mix({ label, value, total }: { label: string; value: number; total: number }) {
  const percentage = total > 0 ? Math.round((value / total) * 1000) / 10 : 0;
  return <div><div className="flex justify-between text-sm"><b>{label}</b><span>{money(value)} · {percentage}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-[#C8102E]" style={{ width: `${Math.min(100, percentage)}%` }}/></div></div>;
}
