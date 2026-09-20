export type ReportOption = {
  _id: string;
  name: string;
  dataset: string;
};

export type Frequency =
  | "one_time"
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export type ReportFormat = "csv" | "xlsx" | "pdf";
export type ScheduleStatus = "active" | "paused" | "completed" | "archived";

export type ScheduleConfig = {
  frequency: Frequency;
  timezone: string;
  hour: number;
  minute: number;
  dayOfWeek: number;
  dayOfMonth: number;
  monthOfYear: number;
  runAt?: string | null;
};

export type Schedule = {
  _id: string;
  name: string;
  description: string;
  reportId: ReportOption;
  format: ReportFormat;
  recipients: string[];
  schedule: ScheduleConfig;
  status: ScheduleStatus;
  nextRunAt?: string | null;
  lastRunAt?: string | null;
  runCount: number;
  failureCount: number;
  deletedAt?: string | null;
  lastJobId?: { status?: string; createdAt?: string } | null;
};

export type ScheduleJob = {
  _id: string;
  status: string;
  source: string;
  format: ReportFormat;
  scheduledFor: string;
  completedAt?: string | null;
  failedAt?: string | null;
  durationMs?: number;
  rowCount?: number;
  outputFilename?: string;
  errorMessage?: string;
};

export type ScheduleAudit = {
  _id: string;
  action: string;
  createdAt: string;
  actorId?: { name?: string; email?: string } | null;
  metadata?: Record<string, unknown>;
};

export type ScheduleDetail = {
  schedule: Schedule;
  jobs: ScheduleJob[];
  audits: ScheduleAudit[];
};

export type ScheduleForm = {
  name: string;
  description: string;
  reportId: string;
  format: ReportFormat;
  recipients: string;
  frequency: Frequency;
  timezone: string;
  hour: number;
  minute: number;
  dayOfWeek: number;
  dayOfMonth: number;
  monthOfYear: number;
  runAt: string;
};

export const initialScheduleForm: ScheduleForm = {
  name: "",
  description: "",
  reportId: "",
  format: "pdf",
  recipients: "",
  frequency: "daily",
  timezone: "Asia/Kolkata",
  hour: 9,
  minute: 0,
  dayOfWeek: 1,
  dayOfMonth: 1,
  monthOfYear: 1,
  runAt: "",
};

export const formatScheduleDateTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Not scheduled";

function toLocalDateTime(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}

export function scheduleToForm(schedule: Schedule): ScheduleForm {
  return {
    name: schedule.name,
    description: schedule.description ?? "",
    reportId: schedule.reportId?._id ?? "",
    format: schedule.format,
    recipients: schedule.recipients.join(", "),
    frequency: schedule.schedule.frequency,
    timezone: schedule.schedule.timezone,
    hour: schedule.schedule.hour,
    minute: schedule.schedule.minute,
    dayOfWeek: schedule.schedule.dayOfWeek,
    dayOfMonth: schedule.schedule.dayOfMonth,
    monthOfYear: schedule.schedule.monthOfYear,
    runAt: toLocalDateTime(schedule.schedule.runAt),
  };
}

export function schedulePayload(form: ScheduleForm) {
  const recipients = form.recipients
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const runAt =
    form.frequency === "one_time" && form.runAt
      ? new Date(form.runAt).toISOString()
      : null;

  return {
    name: form.name,
    description: form.description,
    reportId: form.reportId,
    format: form.format,
    recipients,
    schedule: {
      frequency: form.frequency,
      timezone: form.timezone,
      hour: form.hour,
      minute: form.minute,
      dayOfWeek: form.dayOfWeek,
      dayOfMonth: form.dayOfMonth,
      monthOfYear: form.monthOfYear,
      runAt,
    },
  };
}
