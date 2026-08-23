"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CustomActionModal } from "@/components/admin/CustomActionModal";

import { todayInputValue } from "@/lib/validation/dateTime";

type ApiEnvelope<T> = { data: T; message?: string; error?: string };
type Summary = {
  totalItems: number;
  totalStockUnits: number;
  inventoryValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  expiredCount: number;
  expiringSoonCount: number;
  alerts: Record<string, number>;
};
type TrendRow = Record<string, number | string> & { date: string };
type TopItem = {
  inventoryItemId?: string;
  _id?: string;
  name: string;
  sku: string;
  unit: string;
  quantity?: number;
  value?: number;
  currentStock?: number;
  inventoryValue?: number;
};
type AutomationJob = {
  _id: string;
  jobType: string;
  status: string;
  source: string;
  attempts: number;
  durationMs: number;
  errorMessage: string;
  createdAt: string;
};
type ScheduledReport = {
  _id: string;
  name: string;
  reportType: string;
  frequency: string;
  format: string;
  enabled: boolean;
  recipients: string[];
  nextRunAt: string;
  lastRunAt: string | null;
};

type ScheduleForm = {
  name: string;
  reportType: "valuation" | "stock_ledger" | "consumption" | "expiry" | "abc_analysis";
  frequency: "daily" | "weekly" | "monthly";
  format: "csv" | "xlsx" | "pdf";
  recipients: string;
  nextRunAt: string;
};

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function unwrap<T>(payload: ApiEnvelope<T> | T): T {
  return typeof payload === "object" && payload !== null && "data" in payload
    ? (payload as ApiEnvelope<T>).data
    : (payload as T);
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok) throw new Error(payload.message ?? payload.error ?? "Request failed.");
  return unwrap(payload);
}

const initialSchedule: ScheduleForm = {
  name: "",
  reportType: "valuation",
  frequency: "monthly",
  format: "csv",
  recipients: "",
  nextRunAt: `${todayInputValue()}T09:00`,
};

export function InventoryAutomationDashboardClient({ canManage }: { canManage: boolean }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trends, setTrends] = useState<TrendRow[]>([]);
  const [topItems, setTopItems] = useState<{ mostConsumed: TopItem[]; highestValue: TopItem[] }>({ mostConsumed: [], highestValue: [] });
  const [jobs, setJobs] = useState<AutomationJob[]>([]);
  const [schedules, setSchedules] = useState<ScheduledReport[]>([]);
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>(initialSchedule);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ScheduledReport | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [summaryData, trendData, topData, jobData, scheduleData] = await Promise.all([
        request<Summary>("/api/v1/admin/inventory/dashboard/summary"),
        request<{ rows: TrendRow[] }>("/api/v1/admin/inventory/dashboard/trends?days=30"),
        request<{ mostConsumed: TopItem[]; highestValue: TopItem[] }>("/api/v1/admin/inventory/dashboard/top-items?limit=8"),
        request<{ jobs: AutomationJob[] }>("/api/v1/admin/inventory/automation/jobs?limit=12"),
        request<{ schedules: ScheduledReport[] }>("/api/v1/admin/inventory/scheduled-reports"),
      ]);
      setSummary(summaryData);
      setTrends(trendData.rows);
      setTopItems(topData);
      setJobs(jobData.jobs);
      setSchedules(scheduleData.schedules);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load inventory analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const maxTrend = useMemo(() => {
    return Math.max(1, ...trends.flatMap((row) => Object.entries(row).filter(([key, value]) => key.endsWith("Quantity") && typeof value === "number").map(([, value]) => Number(value))));
  }, [trends]);

  const runAlertScan = async () => {
    setWorking(true);
    setError("");
    try {
      await request("/api/v1/admin/inventory/automation/run", {
        method: "POST",
        body: JSON.stringify({ jobType: "alert_scan", payload: {}, maxAttempts: 3 }),
      });
      setNotice("Inventory alert scan completed.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to run alert scan.");
    } finally {
      setWorking(false);
    }
  };

  const createSchedule = async () => {
    if (!scheduleForm.name.trim()) {
      setError("Schedule name is required.");
      return;
    }
    setWorking(true);
    setError("");
    try {
      await request("/api/v1/admin/inventory/scheduled-reports", {
        method: "POST",
        body: JSON.stringify({
          name: scheduleForm.name.trim(),
          reportType: scheduleForm.reportType,
          frequency: scheduleForm.frequency,
          format: scheduleForm.format,
          recipients: scheduleForm.recipients.split(",").map((value) => value.trim()).filter(Boolean),
          filters: {},
          nextRunAt: new Date(scheduleForm.nextRunAt).toISOString(),
          enabled: true,
        }),
      });
      setScheduleForm(initialSchedule);
      setNotice("Scheduled report created.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create schedule.");
    } finally {
      setWorking(false);
    }
  };

  const deleteSchedule = async (id: string) => {
    setWorking(true);
    setError("");
    try {
      await request(`/api/v1/admin/inventory/scheduled-reports/${id}`, { method: "DELETE" });
      setNotice("Scheduled report deleted.");
      setDeleteTarget(null);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete schedule.");
    } finally {
      setWorking(false);
    }
  };

  if (loading && !summary) return <div className="rounded-3xl border border-neutral-200 bg-white p-8">Loading inventory analytics…</div>;

  const cards = [
    ["Inventory value", money.format(summary?.inventoryValue ?? 0)],
    ["Active SKUs", String(summary?.totalItems ?? 0)],
    ["Low stock", String(summary?.lowStockItems ?? 0)],
    ["Out of stock", String(summary?.outOfStockItems ?? 0)],
    ["Expiring in 7 days", String(summary?.expiringSoonCount ?? 0)],
    ["Expired batches", String(summary?.expiredCount ?? 0)],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl bg-neutral-950 p-6 text-white md:flex-row md:items-center md:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-400">Phase 5 automation</p><h1 className="mt-2 text-3xl font-black">Inventory Analytics & Automation</h1><p className="mt-2 max-w-2xl text-sm text-neutral-300">Live KPIs, movement trends, alert scans, job history and scheduled report delivery.</p></div>
        {canManage ? <button type="button" disabled={working} onClick={() => void runAlertScan()} className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold hover:bg-red-500 disabled:opacity-50">Run alert scan</button> : null}
      </div>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {notice ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([label, value]) => <div key={label} className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm"><p className="text-sm text-neutral-500">{label}</p><p className="mt-2 text-3xl font-black text-neutral-950">{value}</p></div>)}</div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-neutral-200 bg-white p-6"><h2 className="text-xl font-black">30-day stock movement trend</h2><div className="mt-5 space-y-3">{trends.slice(-14).map((row) => { const total = Object.entries(row).filter(([key, value]) => key.endsWith("Quantity") && typeof value === "number").reduce((sum, [, value]) => sum + Number(value), 0); return <div key={row.date} className="grid grid-cols-[90px_1fr_70px] items-center gap-3 text-xs"><span>{row.date}</span><div className="h-3 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-neutral-900" style={{ width: `${Math.max(2, (total / maxTrend) * 100)}%` }} /></div><span className="text-right font-bold">{total.toFixed(2)}</span></div>; })}{trends.length === 0 ? <p className="text-sm text-neutral-500">No movement data yet.</p> : null}</div></section>
        <section className="rounded-3xl border border-neutral-200 bg-white p-6"><h2 className="text-xl font-black">Alert status</h2><div className="mt-5 grid grid-cols-3 gap-3">{["open", "acknowledged", "resolved"].map((status) => <div key={status} className="rounded-2xl bg-neutral-50 p-4"><p className="text-xs uppercase tracking-wide text-neutral-500">{status}</p><p className="mt-2 text-2xl font-black">{summary?.alerts?.[status] ?? 0}</p></div>)}</div></section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-neutral-200 bg-white p-6"><h2 className="text-xl font-black">Most consumed</h2><div className="mt-4 divide-y divide-neutral-100">{topItems.mostConsumed.map((item) => <div key={item.inventoryItemId ?? item.sku} className="flex items-center justify-between py-3"><div><p className="font-bold">{item.name}</p><p className="text-xs text-neutral-500">{item.sku}</p></div><p className="font-black">{Number(item.quantity ?? 0).toFixed(2)} {item.unit}</p></div>)}</div></section>
        <section className="rounded-3xl border border-neutral-200 bg-white p-6"><h2 className="text-xl font-black">Highest inventory value</h2><div className="mt-4 divide-y divide-neutral-100">{topItems.highestValue.map((item) => <div key={item._id ?? item.sku} className="flex items-center justify-between py-3"><div><p className="font-bold">{item.name}</p><p className="text-xs text-neutral-500">{item.sku}</p></div><p className="font-black">{money.format(Number(item.inventoryValue ?? 0))}</p></div>)}</div></section>
      </div>

      <section className="rounded-3xl border border-neutral-200 bg-white p-6"><h2 className="text-xl font-black">Automation job history</h2><div className="mt-4 overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b text-left text-neutral-500"><th className="py-3">Job</th><th>Status</th><th>Source</th><th>Attempts</th><th>Duration</th><th>Created</th></tr></thead><tbody>{jobs.map((job) => <tr key={job._id} className="border-b border-neutral-100"><td className="py-3 font-bold">{job.jobType}</td><td>{job.status}</td><td>{job.source}</td><td>{job.attempts}</td><td>{job.durationMs} ms</td><td>{new Date(job.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div></section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-black">Scheduled reports</h2></div>{canManage ? <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5"><input className="rounded-xl border px-3 py-2" placeholder="Schedule name" value={scheduleForm.name} onChange={(event) => setScheduleForm((current) => ({ ...current, name: event.target.value }))} /><select className="rounded-xl border px-3 py-2" value={scheduleForm.reportType} onChange={(event) => setScheduleForm((current) => ({ ...current, reportType: event.target.value as ScheduleForm["reportType"] }))}><option value="valuation">Valuation</option><option value="stock_ledger">Stock ledger</option><option value="consumption">Consumption</option><option value="expiry">Expiry</option><option value="abc_analysis">ABC analysis</option></select><select className="rounded-xl border px-3 py-2" value={scheduleForm.frequency} onChange={(event) => setScheduleForm((current) => ({ ...current, frequency: event.target.value as ScheduleForm["frequency"] }))}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select><input type="datetime-local" className="rounded-xl border px-3 py-2" value={scheduleForm.nextRunAt} onChange={(event) => setScheduleForm((current) => ({ ...current, nextRunAt: event.target.value }))} /><button type="button" disabled={working} onClick={() => void createSchedule()} className="rounded-xl bg-neutral-950 px-4 py-2 font-bold text-white disabled:opacity-50">Create schedule</button><input className="rounded-xl border px-3 py-2 md:col-span-2 xl:col-span-5" placeholder="Recipient emails, comma separated" value={scheduleForm.recipients} onChange={(event) => setScheduleForm((current) => ({ ...current, recipients: event.target.value }))} /></div> : null}<div className="mt-5 overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b text-left text-neutral-500"><th className="py-3">Name</th><th>Report</th><th>Frequency</th><th>Next run</th><th>Recipients</th><th /></tr></thead><tbody>{schedules.map((schedule) => <tr key={schedule._id} className="border-b border-neutral-100"><td className="py-3 font-bold">{schedule.name}</td><td>{schedule.reportType}</td><td>{schedule.frequency}</td><td>{new Date(schedule.nextRunAt).toLocaleString()}</td><td>{schedule.recipients.length}</td><td className="text-right">{canManage ? <button type="button" onClick={() => setDeleteTarget(schedule)} className="font-bold text-red-600">Delete</button> : null}</td></tr>)}</tbody></table></div></section>

      <CustomActionModal
        open={Boolean(deleteTarget)}
        title="Delete scheduled report?"
        description={deleteTarget ? `Delete ${deleteTarget.name}? This action cannot be undone.` : ""}
        confirmLabel="Delete report"
        tone="danger"
        loading={working}
        onClose={() => { if (!working) setDeleteTarget(null); }}
        onConfirm={async () => { if (deleteTarget) await deleteSchedule(deleteTarget._id); }}
      />
    </div>
  );
}
