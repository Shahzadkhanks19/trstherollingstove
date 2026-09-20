"use client";

import type { FormEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { SectionCard } from "@/components/admin/AdminPrimitives";
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
  onFormChange: React.Dispatch<React.SetStateAction<ScheduleForm>>;
  onSubmit: (event: FormEvent) => void;
};

export function ScheduledReportCreateForm({
  form,
  reports,
  saving,
  onFormChange,
  onSubmit,
}: Props) {
  return (
    <SectionCard
      title="Create schedule"
      description="All times run in the selected IANA timezone."
    >
      <form className="grid gap-3" onSubmit={onSubmit}>
        <label className="text-xs font-black">
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
        <button
          disabled={saving || !reports.length}
          className="h-11 rounded-xl bg-[#C8102E] px-5 text-xs font-black text-white disabled:opacity-50"
        >
          <FontAwesomeIcon icon={faPlus} className="mr-2" />
          Create schedule
        </button>
      </form>
    </SectionCard>
  );
}
