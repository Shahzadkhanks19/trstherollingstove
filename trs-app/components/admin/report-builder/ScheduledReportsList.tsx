"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBoxArchive,
  faCirclePause,
  faCirclePlay,
  faClock,
  faEye,
  faPen,
  faPlay,
  faRotateLeft,
} from "@fortawesome/free-solid-svg-icons";
import {
  SectionCard,
  StatusBadge,
} from "@/components/admin/AdminPrimitives";
import { formatScheduleDateTime as dateTime, type Schedule } from "@/components/admin/report-builder/scheduled-reports.types";

export type ScheduleAction =
  | "pause"
  | "resume"
  | "run_now"
  | "archive"
  | "restore";

type Props = {
  schedules: Schedule[];
  loading: boolean;
  saving: boolean;
  includeArchived: boolean;
  onIncludeArchivedChange: (value: boolean) => void;
  onOpenDetail: (id: string) => void;
  onEdit: (schedule: Schedule) => void;
  onAction: (id: string, action: ScheduleAction) => void;
};

export function ScheduledReportsList({
  schedules,
  loading,
  saving,
  includeArchived,
  onIncludeArchivedChange,
  onOpenDetail,
  onEdit,
  onAction,
}: Props) {
  return (
    <SectionCard
      title="Schedules"
      description="Run-now requests enter the background queue and retain complete execution history."
    >
      <div className="mb-4 flex justify-end">
        <label className="flex items-center gap-2 text-xs font-black">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(event) => onIncludeArchivedChange(event.target.checked)}
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
                    onClick={() => onOpenDetail(row._id)}
                    className="rounded-lg border px-3 py-2 text-xs font-black"
                  >
                    <FontAwesomeIcon icon={faEye} className="mr-2" />
                    History
                  </button>
                  {!row.deletedAt ? (
                    <button
                      onClick={() => onEdit(row)}
                      className="rounded-lg border px-3 py-2 text-xs font-black"
                    >
                      <FontAwesomeIcon icon={faPen} className="mr-2" />
                      Edit
                    </button>
                  ) : null}
                  {!row.deletedAt ? (
                    <button
                      disabled={saving}
                      onClick={() => onAction(row._id, "run_now")}
                      className="rounded-lg border px-3 py-2 text-xs font-black"
                    >
                      <FontAwesomeIcon icon={faPlay} className="mr-2" />
                      Run now
                    </button>
                  ) : null}
                  {!row.deletedAt && row.status === "active" ? (
                    <button
                      onClick={() => onAction(row._id, "pause")}
                      className="rounded-lg border px-3 py-2 text-xs font-black"
                    >
                      <FontAwesomeIcon icon={faCirclePause} className="mr-2" />
                      Pause
                    </button>
                  ) : null}
                  {!row.deletedAt && row.status === "paused" ? (
                    <button
                      onClick={() => onAction(row._id, "resume")}
                      className="rounded-lg border px-3 py-2 text-xs font-black"
                    >
                      <FontAwesomeIcon icon={faCirclePlay} className="mr-2" />
                      Resume
                    </button>
                  ) : null}
                  <button
                    onClick={() =>
                      onAction(row._id, row.deletedAt ? "restore" : "archive")
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
  );
}
