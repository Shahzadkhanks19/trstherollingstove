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
} from "@fortawesome/free-solid-svg-icons";
import { PageHeader } from "@/components/admin/AdminPrimitives";

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
  ScheduledReportsList,
  type ScheduleAction,
} from "@/components/admin/report-builder/ScheduledReportsList";
import { ScheduledReportHistoryDrawer } from "@/components/admin/report-builder/ScheduledReportHistoryDrawer";
import { ScheduledReportEditDialog } from "@/components/admin/report-builder/ScheduledReportEditDialog";
import { ScheduledReportCreateForm } from "@/components/admin/report-builder/ScheduledReportCreateForm";

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
        <ScheduledReportCreateForm
          form={form}
          reports={reports}
          saving={saving}
          onFormChange={setForm}
          onSubmit={create}
        />

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
        <ScheduledReportEditDialog
          form={editForm}
          reports={reports}
          saving={saving}
          onFormChange={setEditForm}
          onSubmit={update}
          onClose={() => setEditingId(null)}
        />
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
