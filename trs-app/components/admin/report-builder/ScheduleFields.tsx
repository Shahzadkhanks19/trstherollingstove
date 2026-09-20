"use client";

import type { Dispatch, SetStateAction } from "react";
import type {
  Frequency,
  ReportFormat,
  ScheduleForm,
} from "@/components/admin/report-builder/scheduled-reports.types";

export const scheduledReportInput =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-[#C8102E]";

type Props = {
  form: ScheduleForm;
  setForm: Dispatch<SetStateAction<ScheduleForm>>;
};

export function ScheduleFields({ form, setForm }: Props) {
  return (
    <div className="grid gap-3">
      <label className="text-xs font-black">
        Schedule name
        <input
          required
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          className={`${scheduledReportInput} mt-2`}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-black">
          Format
          <select
            value={form.format}
            onChange={(event) =>
              setForm({ ...form, format: event.target.value as ReportFormat })
            }
            className={`${scheduledReportInput} mt-2`}
          >
            <option value="pdf">PDF</option>
            <option value="xlsx">Excel</option>
            <option value="csv">CSV</option>
          </select>
        </label>
        <label className="text-xs font-black">
          Frequency
          <select
            value={form.frequency}
            onChange={(event) =>
              setForm({ ...form, frequency: event.target.value as Frequency })
            }
            className={`${scheduledReportInput} mt-2`}
          >
            {(
              [
                "one_time",
                "daily",
                "weekly",
                "monthly",
                "quarterly",
                "yearly",
              ] as Frequency[]
            ).map((value) => (
              <option key={value} value={value}>
                {value.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="text-xs font-black">
        Timezone
        <input
          required
          value={form.timezone}
          onChange={(event) =>
            setForm({ ...form, timezone: event.target.value })
          }
          className={`${scheduledReportInput} mt-2`}
        />
      </label>
      {form.frequency === "one_time" ? (
        <label className="text-xs font-black">
          Run at
          <input
            required
            type="datetime-local"
            value={form.runAt}
            onChange={(event) => setForm({ ...form, runAt: event.target.value })}
            className={`${scheduledReportInput} mt-2`}
          />
        </label>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-black">
            Hour
            <input
              type="number"
              min="0"
              max="23"
              value={form.hour}
              onChange={(event) =>
                setForm({ ...form, hour: Number(event.target.value) })
              }
              className={`${scheduledReportInput} mt-2`}
            />
          </label>
          <label className="text-xs font-black">
            Minute
            <input
              type="number"
              min="0"
              max="59"
              value={form.minute}
              onChange={(event) =>
                setForm({ ...form, minute: Number(event.target.value) })
              }
              className={`${scheduledReportInput} mt-2`}
            />
          </label>
          {form.frequency === "weekly" ? (
            <label className="text-xs font-black sm:col-span-2">
              Day of week
              <select
                value={form.dayOfWeek}
                onChange={(event) =>
                  setForm({ ...form, dayOfWeek: Number(event.target.value) })
                }
                className={`${scheduledReportInput} mt-2`}
              >
                {[
                  "Sunday",
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                ].map((value, index) => (
                  <option key={value} value={index}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {["monthly", "quarterly", "yearly"].includes(form.frequency) ? (
            <label className="text-xs font-black">
              Day of month
              <input
                type="number"
                min="1"
                max="28"
                value={form.dayOfMonth}
                onChange={(event) =>
                  setForm({ ...form, dayOfMonth: Number(event.target.value) })
                }
                className={`${scheduledReportInput} mt-2`}
              />
            </label>
          ) : null}
          {form.frequency === "yearly" ? (
            <label className="text-xs font-black">
              Month
              <input
                type="number"
                min="1"
                max="12"
                value={form.monthOfYear}
                onChange={(event) =>
                  setForm({ ...form, monthOfYear: Number(event.target.value) })
                }
                className={`${scheduledReportInput} mt-2`}
              />
            </label>
          ) : null}
        </div>
      )}
      <label className="text-xs font-black">
        Recipients (comma separated)
        <input
          value={form.recipients}
          onChange={(event) =>
            setForm({ ...form, recipients: event.target.value })
          }
          className={`${scheduledReportInput} mt-2`}
          placeholder="owner@example.com, manager@example.com"
        />
      </label>
      <label className="text-xs font-black">
        Description
        <textarea
          value={form.description}
          onChange={(event) =>
            setForm({ ...form, description: event.target.value })
          }
          className="mt-2 min-h-20 w-full rounded-xl border p-3"
        />
      </label>
    </div>
  );
}
