"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRotateRight } from "@fortawesome/free-solid-svg-icons";
import { PageHeader } from "@/components/admin/AdminPrimitives";

type Status = "new" | "reviewing" | "shortlisted" | "rejected" | "hired";
type Application = { _id: string; openingTitle: string; name: string; phone: string; email: string; experience: string; message: string; resumeUrl: string; status: Status; createdAt: string };
type Api<T> = { data?: T; message?: string };
const statuses: Status[] = ["new", "reviewing", "shortlisted", "rejected", "hired"];

async function parse<T>(response: Response): Promise<Api<T>> {
  return response.json().catch(() => ({ message: "The server returned an invalid response." })) as Promise<Api<T>>;
}

export function AdminJobApplicationsClient() {
  const [rows, setRows] = useState<Application[]>([]);
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/admin/careers/applications${filter === "all" ? "" : `?status=${filter}`}`, { cache: "no-store" });
      const json = await parse<Application[]>(response);
      if (!response.ok || !json.data) throw new Error(json.message || "Unable to load applications.");
      setRows(json.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load applications.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  const counts = useMemo(() => Object.fromEntries(statuses.map((status) => [status, rows.filter((row) => row.status === status).length])), [rows]);

  async function updateStatus(id: string, status: Status) {
    if (workingId) return;
    setWorkingId(id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/v1/admin/careers/applications/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
      const json = await parse<unknown>(response);
      if (!response.ok) throw new Error(json.message || "Unable to update application.");
      setNotice(json.message || "Application updated.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update application.");
    } finally {
      setWorkingId("");
    }
  }

  return <div>
    <PageHeader eyebrow="Careers" title="Job Applications" description="Review applications submitted from the public Careers page." />
    {error && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"><span>{error}</span><button type="button" onClick={() => void load()} disabled={loading} className="rounded-lg border border-red-300 px-3 py-2 text-xs font-black disabled:opacity-50"><FontAwesomeIcon icon={faArrowRotateRight} className="mr-2" />Retry</button></div>}
    {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</p>}
    <div className="mb-5 flex flex-wrap gap-2"><button disabled={loading} onClick={() => setFilter("all")} className="rounded-xl border px-4 py-2 text-xs font-black disabled:opacity-50">All</button>{statuses.map((status) => <button disabled={loading} key={status} onClick={() => setFilter(status)} className="rounded-xl border px-4 py-2 text-xs font-black capitalize disabled:opacity-50">{status} {filter === "all" ? `(${counts[status] ?? 0})` : ""}</button>)}</div>
    {loading && rows.length === 0 ? <div role="status" className="grid gap-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-36 animate-pulse rounded-[22px] bg-slate-100" />)}</div> : !error && rows.length === 0 ? <p className="rounded-2xl border bg-white p-6 text-center text-sm">No applications found for this status.</p> : <div className="grid gap-4">{rows.map((row) => <article key={row._id} className="rounded-[22px] border border-[#e8ddd3] bg-[#fffdf9] p-5"><div className="flex flex-col justify-between gap-4 lg:flex-row"><div><h2 className="text-lg font-black text-[#173044]">{row.name}</h2><p className="text-xs font-semibold text-[#756960]">{row.openingTitle} · {new Date(row.createdAt).toLocaleString("en-IN")}</p><p className="mt-2 text-sm">{row.phone} · {row.email}</p>{row.experience && <p className="mt-2 text-sm text-[#655e57]">Experience: {row.experience}</p>}{row.message && <p className="mt-2 max-w-3xl text-sm leading-6 text-[#655e57]">{row.message}</p>}{row.resumeUrl && <a href={row.resumeUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-black text-[#C8102E]">Open resume</a>}</div><select disabled={Boolean(workingId)} aria-label={`Status for ${row.name}`} value={row.status} onChange={(event) => void updateStatus(row._id, event.target.value as Status)} className="h-11 rounded-xl border px-3 text-xs font-black capitalize disabled:opacity-50">{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></div></article>)}</div>}
  </div>;
}
