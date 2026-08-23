"use client";

import { useCallback, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClockRotateLeft, faRotateLeft } from "@fortawesome/free-solid-svg-icons";

type Version = { _id: string; version: number; changeSummary: string; createdAt: string };
type Execution = { _id: string; status: "completed" | "failed"; rowCount: number; durationMs: number; errorMessage?: string; createdAt: string };
type ApiResponse<T> = { success: boolean; message: string; data: T };

export function ReportHistoryPanel({ reportId, onRestored }: { reportId: string; onRestored: () => Promise<void> }) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [busyVersion, setBusyVersion] = useState<number | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [versionsResponse, executionsResponse] = await Promise.all([
      fetch(`/api/v1/admin/report-builder/definitions/${reportId}/versions`, { cache: "no-store" }),
      fetch(`/api/v1/admin/report-builder/definitions/${reportId}/executions?limit=20`, { cache: "no-store" }),
    ]);
    const versionsBody = await versionsResponse.json() as ApiResponse<{ versions: Version[] }>;
    const executionsBody = await executionsResponse.json() as ApiResponse<{ executions: Execution[] }>;
    if (!versionsResponse.ok) throw new Error(versionsBody.message);
    if (!executionsResponse.ok) throw new Error(executionsBody.message);
    setVersions(versionsBody.data.versions);
    setExecutions(executionsBody.data.executions);
  }, [reportId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load().catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Unable to load report history.");
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [load]);

  async function restore(version: number) {
    setBusyVersion(version); setError("");
    try {
      const response = await fetch(`/api/v1/admin/report-builder/definitions/${reportId}/versions`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ version }),
      });
      const body = await response.json() as ApiResponse<unknown>;
      if (!response.ok) throw new Error(body.message);
      await onRestored(); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to restore version."); }
    finally { setBusyVersion(null); }
  }

  return <div className="grid gap-6 lg:grid-cols-2">
    <div>
      <h3 className="mb-3 text-sm font-black"><FontAwesomeIcon icon={faClockRotateLeft} className="mr-2" />Version history</h3>
      <div className="max-h-72 space-y-2 overflow-auto pr-1">
        {versions.map((version, index) => <div key={version._id} className="flex items-center justify-between gap-3 rounded-xl border border-black/10 p-3">
          <div><b className="block text-sm">Version {version.version}{index === 0 ? " · Latest snapshot" : ""}</b><span className="text-xs text-black/50">{version.changeSummary} · {new Date(version.createdAt).toLocaleString("en-IN")}</span></div>
          {index > 0 ? <button type="button" disabled={busyVersion !== null} onClick={() => void restore(version.version)} className="rounded-lg border border-black/15 px-3 py-2 text-xs font-black disabled:opacity-40"><FontAwesomeIcon icon={faRotateLeft} className="mr-1" />Restore</button> : null}
        </div>)}
        {!versions.length ? <p className="text-sm text-black/50">No versions recorded yet.</p> : null}
      </div>
    </div>
    <div>
      <h3 className="mb-3 text-sm font-black">Execution history</h3>
      <div className="max-h-72 space-y-2 overflow-auto pr-1">
        {executions.map((execution) => <div key={execution._id} className="rounded-xl border border-black/10 p-3">
          <div className="flex items-center justify-between"><b className={`text-sm ${execution.status === "failed" ? "text-red-700" : "text-emerald-700"}`}>{execution.status}</b><span className="text-xs text-black/45">{new Date(execution.createdAt).toLocaleString("en-IN")}</span></div>
          <p className="mt-1 text-xs text-black/55">{execution.rowCount} rows · {execution.durationMs} ms{execution.errorMessage ? ` · ${execution.errorMessage}` : ""}</p>
        </div>)}
        {!executions.length ? <p className="text-sm text-black/50">Run a saved report to create execution history.</p> : null}
      </div>
    </div>
    {error ? <p role="alert" className="text-sm font-bold text-red-700 lg:col-span-2">{error}</p> : null}
  </div>;
}
