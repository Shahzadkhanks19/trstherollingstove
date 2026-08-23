"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRotateRight, faBan, faDownload, faPlay, faRotateRight } from "@fortawesome/free-solid-svg-icons";
import { PageHeader, SectionCard, StatusBadge } from "@/components/admin/AdminPrimitives";

type JobStatus = "queued" | "processing" | "completed" | "failed" | "cancelled";
type Job = {
  _id: string;
  reportId?: { name?: string; dataset?: string } | null;
  scheduleId?: { name?: string } | null;
  requestedBy?: { name?: string; email?: string } | null;
  source: "scheduled" | "manual";
  format: "csv" | "xlsx" | "pdf";
  status: JobStatus;
  priority: number;
  attempt: number;
  maxAttempts: number;
  scheduledFor: string;
  nextAttemptAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  failedAt?: string | null;
  durationMs: number;
  rowCount: number;
  outputKey: string;
  outputSize: number;
  outputFilename: string;
  errorMessage: string;
  deliveryStatus?: "pending" | "skipped" | "sent" | "failed";
  deliveryError?: string;
  createdAt: string;
};
type Summary = { queued: number; processing: number; completed: number; failed: number; cancelled: number; staleProcessing: number; averageDurationMs: number };
type Payload = { jobs: Job[]; summary: Summary; pagination: { page: number; limit: number; total: number; pages: number } };

const dateTime = (value?: string | null) => value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const bytes = (value: number) => value >= 1024 * 1024 ? `${(value / 1024 / 1024).toFixed(1)} MB` : value >= 1024 ? `${(value / 1024).toFixed(1)} KB` : `${value} B`;
const duration = (value: number) => value >= 1000 ? `${(value / 1000).toFixed(1)} s` : `${value} ms`;

export function ReportJobsClient() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [summary, setSummary] = useState<Summary>({ queued: 0, processing: 0, completed: 0, failed: 0, cancelled: 0, staleProcessing: 0, averageDurationMs: 0 });
  const [status, setStatus] = useState<"all" | JobStatus>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const query = useMemo(() => new URLSearchParams({ ...(status !== "all" ? { status } : {}), ...(search.trim() ? { search: search.trim() } : {}), page: String(page), limit: "25" }).toString(), [status, search, page]);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/v1/admin/report-builder/jobs?${query}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to load report jobs.");
      const data = payload.data as Payload;
      setJobs(data.jobs); setSummary(data.summary); setPages(data.pagination.pages);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load report jobs."); }
    finally { setLoading(false); }
  }, [query]);

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  async function request(url: string, options: RequestInit) {
    setWorking(true); setError(""); setNotice("");
    try {
      const response = await fetch(url, options); const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Request failed.");
      setNotice(payload.message || "Request completed."); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Request failed."); }
    finally { setWorking(false); }
  }

  async function runWorker() { await request("/api/v1/admin/report-builder/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ limit: 10 }) }); }
  async function action(id: string, value: "retry" | "cancel") { await request(`/api/v1/admin/report-builder/jobs/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: value }) }); }

  const cards: Array<[string, number, string]> = [
    ["Queued", summary.queued, "Waiting for worker"], ["Processing", summary.processing, `${summary.staleProcessing} stale locks`],
    ["Completed", summary.completed, `Average ${duration(summary.averageDurationMs)}`], ["Failed", summary.failed, `${summary.cancelled} cancelled`],
  ];

  return <div className="space-y-6">
    <PageHeader eyebrow="Phase 4.2.4 · Batch 2" title="Report Background Jobs" description="Run scheduled-report workers, monitor the queue, retry failures, cancel queued work and download completed outputs." actions={<div className="flex flex-wrap gap-2"><button onClick={() => void load()} className="rounded-xl border bg-white px-4 py-2 text-xs font-black"><FontAwesomeIcon icon={faArrowRotateRight} className="mr-2"/>Refresh</button><button disabled={working} onClick={() => void runWorker()} className="rounded-xl bg-[#C8102E] px-4 py-2 text-xs font-black text-white disabled:opacity-50"><FontAwesomeIcon icon={faPlay} className="mr-2"/>{working ? "Working…" : "Run worker"}</button></div>}/>
    {error ? <p className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p> : null}
    {notice ? <p className="rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{notice}</p> : null}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, detail]) => <article key={label} className="rounded-2xl border bg-white p-5"><p className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</p><p className="mt-3 text-3xl font-black text-[#173044]">{value}</p><p className="mt-1 text-xs font-bold text-slate-500">{detail}</p></article>)}</div>
    <SectionCard title="Queue filters" description="Search by generated filename, error or deduplication key."><div className="grid gap-3 md:grid-cols-[220px_1fr_auto]"><select value={status} onChange={(event) => { setStatus(event.target.value as typeof status); setPage(1); }} className="h-11 rounded-xl border bg-white px-3 text-sm font-bold"><option value="all">All statuses</option>{["queued","processing","completed","failed","cancelled"].map((value) => <option key={value} value={value}>{value}</option>)}</select><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Filename, error or queue key" className="h-11 rounded-xl border px-3 text-sm font-bold"/><button onClick={() => void load()} className="h-11 rounded-xl bg-[#173044] px-5 text-xs font-black text-white">Apply</button></div></SectionCard>
    <SectionCard title="Execution history" description="Outputs are persisted in MongoDB GridFS and available after successful completion.">
      {loading ? <p className="py-14 text-center font-bold text-slate-400">Loading report jobs…</p> : <div className="overflow-x-auto"><table className="min-w-[980px] w-full text-left text-xs"><thead><tr className="border-b text-slate-500"><th className="p-3">Report</th><th className="p-3">Source</th><th className="p-3">Status</th><th className="p-3">Attempts</th><th className="p-3">Timing</th><th className="p-3">Result</th><th className="p-3">Delivery</th><th className="p-3 text-right">Actions</th></tr></thead><tbody>{jobs.map((job) => <tr key={job._id} className="border-b align-top"><td className="p-3"><p className="font-black text-[#173044]">{job.reportId?.name || "Missing report"}</p><p className="text-slate-500">{job.scheduleId?.name || "Manual execution"}</p><p className="mt-1 text-[10px] uppercase text-slate-400">{job.format}</p></td><td className="p-3 capitalize">{job.source}<p className="mt-1 text-slate-400">{job.requestedBy?.name || job.requestedBy?.email || "System"}</p></td><td className="p-3"><StatusBadge value={job.status}/>{job.errorMessage ? <p className="mt-2 max-w-xs text-[11px] font-bold text-red-600">{job.errorMessage}</p> : null}</td><td className="p-3 font-bold">{job.attempt}/{job.maxAttempts}{job.nextAttemptAt ? <p className="mt-1 text-slate-400">Retry {dateTime(job.nextAttemptAt)}</p> : null}</td><td className="p-3"><p>{dateTime(job.scheduledFor)}</p><p className="mt-1 text-slate-400">{job.durationMs ? duration(job.durationMs) : "Not finished"}</p></td><td className="p-3"><p className="font-bold">{job.rowCount} rows</p><p className="text-slate-400">{job.outputSize ? bytes(job.outputSize) : "No output"}</p></td><td className="p-3"><StatusBadge value={job.deliveryStatus || "pending"}/>{job.deliveryError ? <p className="mt-1 max-w-xs text-[10px] font-bold text-red-600">{job.deliveryError}</p> : null}</td><td className="p-3"><div className="flex justify-end gap-2">{job.status === "completed" && job.outputKey ? <a href={`/api/v1/admin/report-builder/jobs/${job._id}/download`} className="rounded-lg border px-3 py-2 font-black text-[#173044]"><FontAwesomeIcon icon={faDownload} className="mr-2"/>Download</a> : null}{job.status === "failed" || job.status === "cancelled" ? <button disabled={working} onClick={() => void action(job._id, "retry")} className="rounded-lg border px-3 py-2 font-black"><FontAwesomeIcon icon={faRotateRight} className="mr-2"/>Retry</button> : null}{job.status === "queued" || job.status === "processing" ? <button disabled={working} onClick={() => void action(job._id, "cancel")} className="rounded-lg border px-3 py-2 font-black text-red-700"><FontAwesomeIcon icon={faBan} className="mr-2"/>Cancel</button> : null}</div></td></tr>)}{!jobs.length ? <tr><td colSpan={8} className="py-14 text-center font-bold text-slate-400">No report jobs match these filters.</td></tr> : null}</tbody></table></div>}
      <div className="mt-4 flex items-center justify-between"><button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border px-3 py-2 text-xs font-black disabled:opacity-40">Previous</button><p className="text-xs font-black text-slate-500">Page {page} of {pages}</p><button disabled={page >= pages} onClick={() => setPage((value) => Math.min(pages, value + 1))} className="rounded-lg border px-3 py-2 text-xs font-black disabled:opacity-40">Next</button></div>
    </SectionCard>
  </div>;
}
