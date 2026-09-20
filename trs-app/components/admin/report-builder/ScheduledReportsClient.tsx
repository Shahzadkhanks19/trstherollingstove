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
  faFloppyDisk,
  faPlus,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import {
  PageHeader,
  SectionCard,
} from "@/components/admin/AdminPrimitives";

import {
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
import {
  ScheduledReportsList,
  type ScheduleAction,
} from "@/components/admin/report-builder/ScheduledReportsList";
import { ScheduledReportHistoryDrawer } from "@/components/admin/report-builder/ScheduledReportHistoryDrawer";

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
    value: ScheduleAction,
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

        <ScheduledReportsList
          schedules={schedules}
          loading={loading}
          saving={saving}
          includeArchived={includeArchived}
          onIncludeArchivedChange={setIncludeArchived}
          onOpenDetail={openDetail}
          onEdit={startEditing}
          onAction={(id, value) => void action(id, value)}
        />
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
        <ScheduledReportHistoryDrawer
          detail={detail}
          loading={detailLoading}
          onClose={() => {
            setDetailId(null);
            setDetail(null);
          }}
        />
      ) : null}
    </div>
  );
}
