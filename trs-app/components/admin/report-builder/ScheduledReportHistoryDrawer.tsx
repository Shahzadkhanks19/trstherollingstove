"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import {
  SectionCard,
  StatusBadge,
} from "@/components/admin/AdminPrimitives";
import {
  formatScheduleDateTime as dateTime,
  type ScheduleDetail,
} from "@/components/admin/report-builder/scheduled-reports.types";

type Props = {
  detail: ScheduleDetail | null;
  loading: boolean;
  onClose: () => void;
};

export function ScheduledReportHistoryDrawer({
  detail,
  loading,
  onClose,
}: Props) {
  return (
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
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full border"
            aria-label="Close history"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        {loading ? (
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
  );
}
