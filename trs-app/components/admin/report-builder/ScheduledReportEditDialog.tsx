"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFloppyDisk, faXmark } from "@fortawesome/free-solid-svg-icons";
import {
  ScheduleFields,
  scheduledReportInput as input,
} from "@/components/admin/report-builder/ScheduleFields";
import type {
  ReportOption,
  ScheduleForm,
} from "@/components/admin/report-builder/scheduled-reports.types";

type Props = {
  form: ScheduleForm;
  reports: ReportOption[];
  saving: boolean;
  onFormChange: Dispatch<SetStateAction<ScheduleForm>>;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
};

export function ScheduledReportEditDialog({
  form,
  reports,
  saving,
  onFormChange,
  onSubmit,
  onClose,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Edit scheduled report"
    >
      <form
        onSubmit={onSubmit}
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
            onClick={onClose}
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
            value={form.reportId}
            onChange={(event) =>
              onFormChange({ ...form, reportId: event.target.value })
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
        <ScheduleFields form={form} setForm={onFormChange} />
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
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
  );
}
