"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRotateRight,
  faBoxArchive,
  faCirclePause,
  faCirclePlay,
  faClock,
  faEye,
  faFloppyDisk,
  faPen,
  faPlay,
  faPlus,
  faRotateLeft,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import {
  PageHeader,
  SectionCard,
  StatusBadge,
} from "@/components/admin/AdminPrimitives";

import {
  formatScheduleDateTime as dateTime,
  initialScheduleForm as initialForm,
  schedulePayload,
  scheduleToForm,
  type ReportOption,
  type Schedule,
  type ScheduleDetail,
  type ScheduleForm,
} from "@/components/admin/report-builder/scheduled-reports.types";
import {
  fetchScheduledReportDetail,
  fetchScheduledReports,
  mutateScheduledReport,
} from "@/components/admin/report-builder/scheduled-reports-api";
import {
  ScheduleFields,
  scheduledReportInput as input,
} from "@/components/admin/report-builder/ScheduleFields";

export function ScheduledReportsClient() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [reports, setReports] = useState<ReportOption[]>([]);
  const [form, setForm] = useState<ScheduleForm>(initialForm);
  const [editForm, setEditForm] = useState<ScheduleForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ScheduleDetail | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchScheduledReports(includeArchived);
      setSchedules(data.schedules);
      setReports(data.reports);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load scheduled reports.",
      );
    } finally {
      setLoading(false);
    }
  }, [includeArchived]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setError("");
    try {
      setDetail(await fetchScheduledReportDetail(id));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load schedule history.",
      );
    } finally {
      setDetailLoading(false);
    }
  }, []);

  async function call(url: string, options: RequestInit) {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      setNotice(await mutateScheduledReport(url, options));
      await load();
      if (detailId) await loadDetail(detailId);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Request failed.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    const ok = await call("/api/v1/admin/report-builder/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(schedulePayload(form)),
    });
    if (ok) setForm(initialForm);
  }

  async function update(event: FormEvent) {
    event.preventDefault();
    if (!editingId) return;
    const ok = await call(
      `/api/v1/admin/report-builder/schedules/${editingId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(schedulePayload(editForm)),
      },
    );
    if (ok) setEditingId(null);
  }

  async function action(
    id: string,
    value: "pause" | "resume" | "run_now" | "archive" | "restore",
  ) {
    if (
      (value === "archive" || value === "restore") &&
      !window.confirm(
        value === "archive"
          ? "Archive this scheduled report?"
          : "Restore this scheduled report in paused state?",
      )
    )
      return;
    await call(`/api/v1/admin/report-builder/schedules/${id}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: value }),
    });
  }

  function startEditing(schedule: Schedule) {
    setEditingId(schedule._id);
    setEditForm(scheduleToForm(schedule));
  }

  function openDetail(id: string) {
    setDetailId(id);
    setDetail(null);
    void loadDetail(id);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Phase 4.2.4 · Batch 3"
        title="Scheduled Reports"
        description="Create, edit, pause, resume and manually run automated reports. Review each schedule's execution and audit history from one operational workspace."
        actions={
          <button
            onClick={() => void load()}
            className="rounded-xl bg-[#173044] px-4 py-2 text-xs font-black text-white"
          >
            <FontAwesomeIcon icon={faArrowRotateRight} className="mr-2" />
            Refresh
          </button>
        }
      />
      {error ? (
        <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
          {notice}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[.72fr_1.28fr]">
        <SectionCard
          title="Create schedule"
          description="All times run in the selected IANA timezone."
        >
          <form className="grid gap-3" onSubmit={create}>
            <label className="text-xs font-black">
              Saved report
              <select
                required
                value={form.reportId}
                onChange={(event) =>
                  setForm({ ...form, reportId: event.target.value })
                }
                className={`${input} mt-2`}
              >
                <option value="">Select report</option>
                {reports.map((report) => (
                  <option key={report._id} value={report._id}>
                    {report.name} · {report.dataset}
                  </option>
                ))}
              </select>
            </label>
            <ScheduleFields form={form} setForm={setForm} />
            <button
              disabled={saving || !reports.length}
              className="h-11 rounded-xl bg-[#C8102E] px-5 text-xs font-black text-white disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              Create schedule
            </button>
          </form>
        </SectionCard>

        <SectionCard
          title="Schedules"
          description="Run-now requests enter the background queue and retain complete execution history."
        >
          <div className="mb-4 flex justify-end">
            <label className="flex items-center gap-2 text-xs font-black">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(event) => setIncludeArchived(event.target.checked)}
              />
              Show archived
            </label>
          </div>
          {loading ? (
            <p className="py-12 text-center font-bold text-slate-400">
              Loading schedules…
            </p>
          ) : (
            <div className="space-y-3">
              {schedules.map((row) => (
                <article key={row._id} className="rounded-2xl border p-4">
                  <div className="flex flex-col justify-between gap-4 lg:flex-row">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black text-[#173044]">{row.name}</p>
                        <StatusBadge value={row.status} />
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black uppercase">
                          {row.format}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {row.reportId?.name || "Missing report"} ·{" "}
                        {row.schedule.frequency.replaceAll("_", " ")} ·{" "}
                        {row.schedule.timezone}
                      </p>
                      <p className="mt-2 text-xs font-bold text-[#C8102E]">
                        <FontAwesomeIcon icon={faClock} className="mr-2" />
                        Next: {dateTime(row.nextRunAt)}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Runs {row.runCount} · Failures {row.failureCount}
                        {row.lastJobId?.status
                          ? ` · Last job ${row.lastJobId.status}`
                          : ""}
                      </p>
                      {row.recipients.length ? (
                        <p className="mt-1 text-[11px] text-slate-500">
                          Recipients: {row.recipients.join(", ")}
                        </p>
                      ) : (
                        <p className="mt-1 text-[11px] font-bold text-amber-700">
                          No delivery recipients configured
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => openDetail(row._id)}
                        className="rounded-lg border px-3 py-2 text-xs font-black"
                      >
                        <FontAwesomeIcon icon={faEye} className="mr-2" />
                        History
                      </button>
                      {!row.deletedAt ? (
                        <button
                          onClick={() => startEditing(row)}
                          className="rounded-lg border px-3 py-2 text-xs font-black"
                        >
                          <FontAwesomeIcon icon={faPen} className="mr-2" />
                          Edit
                        </button>
                      ) : null}
                      {!row.deletedAt ? (
                        <button
                          disabled={saving}
                          onClick={() => void action(row._id, "run_now")}
                          className="rounded-lg border px-3 py-2 text-xs font-black"
                        >
                          <FontAwesomeIcon icon={faPlay} className="mr-2" />
                          Run now
                        </button>
                      ) : null}
                      {!row.deletedAt && row.status === "active" ? (
                        <button
                          onClick={() => void action(row._id, "pause")}
                          className="rounded-lg border px-3 py-2 text-xs font-black"
                        >
                          <FontAwesomeIcon
                            icon={faCirclePause}
                            className="mr-2"
                          />
                          Pause
                        </button>
                      ) : null}
                      {!row.deletedAt && row.status === "paused" ? (
                        <button
                          onClick={() => void action(row._id, "resume")}
                          className="rounded-lg border px-3 py-2 text-xs font-black"
                        >
                          <FontAwesomeIcon
                            icon={faCirclePlay}
                            className="mr-2"
                          />
                          Resume
                        </button>
                      ) : null}
                      <button
                        onClick={() =>
                          void action(
                            row._id,
                            row.deletedAt ? "restore" : "archive",
                          )
                        }
                        className="rounded-lg border px-3 py-2 text-xs font-black"
                      >
                        <FontAwesomeIcon
                          icon={row.deletedAt ? faRotateLeft : faBoxArchive}
                          className="mr-2"
                        />
                        {row.deletedAt ? "Restore" : "Archive"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
              {!schedules.length ? (
                <p className="py-12 text-center font-bold text-slate-400">
                  No scheduled reports yet.
                </p>
              ) : null}
            </div>
          )}
        </SectionCard>
      </div>

      {editingId ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Edit scheduled report"
        >
          <form
            onSubmit={update}
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-[#173044]">
                  Edit scheduled report
                </h2>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  Updating an active schedule recalculates its next execution.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="grid h-10 w-10 place-items-center rounded-full border"
                aria-label="Close edit dialog"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
            <label className="mb-3 block text-xs font-black">
              Saved report
              <select
                required
                value={editForm.reportId}
                onChange={(event) =>
                  setEditForm({ ...editForm, reportId: event.target.value })
                }
                className={`${input} mt-2`}
              >
                <option value="">Select report</option>
                {reports.map((report) => (
                  <option key={report._id} value={report._id}>
                    {report.name} · {report.dataset}
                  </option>
                ))}
              </select>
            </label>
            <ScheduleFields form={editForm} setForm={setEditForm} />
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="rounded-xl border px-5 py-3 text-xs font-black"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                className="rounded-xl bg-[#C8102E] px-5 py-3 text-xs font-black text-white disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faFloppyDisk} className="mr-2" />
                Save changes
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {detailId ? (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/45"
          role="dialog"
          aria-modal="true"
          aria-label="Schedule history"
        >
          <aside className="h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-[#173044]">
                  Schedule history
                </h2>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  Execution results and immutable configuration activity.
                </p>
              </div>
              <button
                onClick={() => {
                  setDetailId(null);
                  setDetail(null);
                }}
                className="grid h-10 w-10 place-items-center rounded-full border"
                aria-label="Close history"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
            {detailLoading ? (
              <p className="py-16 text-center font-bold text-slate-400">
                Loading history…
              </p>
            ) : detail ? (
              <div className="space-y-6">
                <SectionCard
                  title={detail.schedule.name}
                  description={`${detail.schedule.reportId?.name || "Missing report"} · ${detail.schedule.format.toUpperCase()}`}
                >
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <p>
                      <span className="font-black">Status:</span>{" "}
                      {detail.schedule.status}
                    </p>
                    <p>
                      <span className="font-black">Next run:</span>{" "}
                      {dateTime(detail.schedule.nextRunAt)}
                    </p>
                    <p>
                      <span className="font-black">Last run:</span>{" "}
                      {dateTime(detail.schedule.lastRunAt)}
                    </p>
                    <p>
                      <span className="font-black">Recipients:</span>{" "}
                      {detail.schedule.recipients.join(", ") || "None"}
                    </p>
                  </div>
                </SectionCard>
                <SectionCard
                  title="Recent executions"
                  description="Latest 50 jobs for this schedule."
                >
                  <div className="space-y-3">
                    {detail.jobs.map((job) => (
                      <article key={job._id} className="rounded-2xl border p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-black text-[#173044]">
                              {job.outputFilename ||
                                `${job.format.toUpperCase()} report`}
                            </p>
                            <p className="text-xs text-slate-500">
                              {job.source} · {dateTime(job.scheduledFor)}
                            </p>
                          </div>
                          <StatusBadge value={job.status} />
                        </div>
                        {job.errorMessage ? (
                          <p className="mt-2 text-xs font-bold text-red-600">
                            {job.errorMessage}
                          </p>
                        ) : null}
                        <p className="mt-2 text-[11px] text-slate-400">
                          {job.rowCount ?? 0} rows ·{" "}
                          {job.durationMs
                            ? `${job.durationMs} ms`
                            : "Not completed"}
                        </p>
                      </article>
                    ))}
                    {!detail.jobs.length ? (
                      <p className="py-8 text-center text-sm font-bold text-slate-400">
                        No executions yet.
                      </p>
                    ) : null}
                  </div>
                </SectionCard>
                <SectionCard
                  title="Audit timeline"
                  description="Schedule creation, changes and actions."
                >
                  <div className="space-y-3">
                    {detail.audits.map((audit) => (
                      <article
                        key={audit._id}
                        className="border-l-2 border-[#C8102E] pl-4"
                      >
                        <p className="text-sm font-black capitalize text-[#173044]">
                          {audit.action.replaceAll("_", " ")}
                        </p>
                        <p className="text-xs text-slate-500">
                          {audit.actorId?.name ||
                            audit.actorId?.email ||
                            "System"}{" "}
                          · {dateTime(audit.createdAt)}
                        </p>
                      </article>
                    ))}
                    {!detail.audits.length ? (
                      <p className="py-8 text-center text-sm font-bold text-slate-400">
                        No audit records.
                      </p>
                    ) : null}
                  </div>
                </SectionCard>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
    </div>
  );
}
