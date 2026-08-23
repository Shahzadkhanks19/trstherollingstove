"use client";
import { financeApi } from "@/lib/api/finance-client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRotateRight,
  faCircleCheck,
  faDownload,
  faMoneyBillTransfer,
  faRotateLeft,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { PageHeader, StatCard } from "@/components/admin/AdminPrimitives";

type Metrics = {
  paymentCount: number;
  capturedCount: number;
  failedCount: number;
  pendingCount: number;
  refundedCount: number;
  grossAmount: number;
  capturedAmount: number;
  refundedAmount: number;
  netCollectedAmount: number;
  successRate: number;
  failureRate: number;
  reconciliationCount: number;
  matchedReconciliationCount: number;
  unmatchedAmount: number;
};
type PaymentRow = {
  _id: string;
  providerPaymentId: string;
  providerOrderId: string;
  provider: string;
  method: string;
  status: string;
  amount: number;
  amountRefunded: number;
  currency: string;
  createdAt: string;
};
type ReconciliationRow = {
  _id: string;
  status: string;
  reconciliationType: string;
  expectedAmount: number;
  settledAmount: number;
  differenceAmount: number;
  settlementReference: string;
  reconciledAt: string;
};
type Summary = {
  snapshot: { metrics: Metrics };
  recentPayments: PaymentRow[];
  recentReconciliations: ReconciliationRow[];
};


const money = (value: number) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0,
}).format(value);

export function PaymentManagementClient() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const load = useCallback(async () => {
    try {
      setError("");
      setData(await financeApi<Summary>(`/api/v1/admin/finance/payment-management/summary?days=${days}`));
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load payment management.");
    }
  }, [days]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  async function rebuild() {
    setWorking(true);
    try {
      await financeApi("/api/v1/admin/finance/payment-management/rebuild", {
        method: "POST", body: JSON.stringify({ days, source: "manual" }),
      });
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Rebuild failed.");
    } finally {
      setWorking(false);
    }
  }
  const metrics = data?.snapshot.metrics;
  return <>
    <PageHeader
      eyebrow="Phase 8 · Financial Management"
      title="Payment Management"
      description="Monitor gateway collections, failures, refunds, reversals and settlement reconciliation across TRS payments."
      action={<div className="flex flex-wrap gap-2">
        <select value={days} onChange={(event) => setDays(Number(event.target.value))} className="rounded-xl border bg-white px-4 py-3 text-xs font-black">
          <option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option><option value={365}>365 days</option>
        </select>
        <Link href={`/api/v1/admin/finance/payment-management/report?days=${days}`} prefetch={false} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-xs font-black">
          <FontAwesomeIcon icon={faDownload}/>Export CSV
        </Link>
        <button disabled={working} onClick={() => void rebuild()} className="inline-flex items-center gap-2 rounded-xl bg-[#173044] px-4 py-3 text-xs font-black text-white">
          <FontAwesomeIcon icon={faArrowRotateRight}/>{working ? "Rebuilding…" : "Rebuild"}
        </button>
      </div>}
    />
    {error ? <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p> : null}
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Net collected" value={money(metrics?.netCollectedAmount ?? 0)} icon={faMoneyBillTransfer} detail={`${metrics?.paymentCount ?? 0} payment records`}/>
      <StatCard label="Success rate" value={`${metrics?.successRate ?? 0}%`} icon={faCircleCheck} detail={`${metrics?.capturedCount ?? 0} captured payments`}/>
      <StatCard label="Refunded" value={money(metrics?.refundedAmount ?? 0)} icon={faRotateLeft} detail={`${metrics?.refundedCount ?? 0} affected payments`}/>
      <StatCard label="Unmatched" value={money(metrics?.unmatchedAmount ?? 0)} icon={faTriangleExclamation} detail={`${metrics?.matchedReconciliationCount ?? 0}/${metrics?.reconciliationCount ?? 0} reconciled`}/>
    </div>
    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <section className="rounded-2xl border bg-white p-5">
        <h2 className="text-lg font-black">Recent payments</h2>
        <div className="mt-4 space-y-3">
          {data?.recentPayments.map((payment) => <div key={payment._id} className="flex justify-between gap-4 rounded-xl border p-3">
            <div><p className="font-black">{payment.providerPaymentId || payment.providerOrderId}</p><p className="text-xs text-slate-500">{payment.provider} · {payment.method || "unknown"} · {new Date(payment.createdAt).toLocaleString("en-IN")}</p></div>
            <div className="text-right"><p className="font-black">{money(payment.amount - payment.amountRefunded)}</p><p className="text-[11px] font-bold uppercase text-slate-500">{payment.status.replaceAll("_", " ")}</p></div>
          </div>)}
        </div>
      </section>
      <section className="rounded-2xl border bg-white p-5">
        <h2 className="text-lg font-black">Recent reconciliation</h2>
        <div className="mt-4 space-y-3">
          {data?.recentReconciliations.map((row) => <div key={row._id} className="flex justify-between gap-4 rounded-xl border p-3">
            <div><p className="font-black">{row.settlementReference || row.reconciliationType}</p><p className="text-xs text-slate-500">Expected {money(row.expectedAmount)} · Settled {money(row.settledAmount)}</p></div>
            <div className="text-right"><p className="font-black">{money(Math.abs(row.differenceAmount))}</p><p className="text-[11px] font-bold uppercase text-slate-500">{row.status}</p></div>
          </div>)}
          {!data?.recentReconciliations.length ? <p className="rounded-xl border border-dashed p-5 text-sm text-slate-500">No reconciliation records in this period.</p> : null}
        </div>
      </section>
    </div>
  </>;
}
