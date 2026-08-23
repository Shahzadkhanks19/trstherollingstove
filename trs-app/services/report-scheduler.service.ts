import { AppError } from "@/lib/errors/AppError";
import { ReportDefinition } from "@/models/ReportDefinition";
import { ReportJob } from "@/models/ReportJob";
import { ReportScheduleAudit } from "@/models/ReportScheduleAudit";
import { ScheduledReport } from "@/models/ScheduledReport";
import type { z } from "zod";
import { scheduledReportScheduleSchema } from "@/validators/scheduledReport";

type ScheduleInput = z.infer<typeof scheduledReportScheduleSchema>;

function normalizeScheduleConfig(value: ScheduleInput | {
  frequency: ScheduleInput["frequency"];
  timezone: string;
  hour: number;
  minute: number;
  dayOfWeek: number;
  dayOfMonth: number;
  monthOfYear: number;
  runAt?: Date | null;
}): ScheduleInput {
  return scheduledReportScheduleSchema.parse({
    frequency: value.frequency,
    timezone: value.timezone,
    hour: value.hour,
    minute: value.minute,
    dayOfWeek: value.dayOfWeek,
    dayOfMonth: value.dayOfMonth,
    monthOfYear: value.monthOfYear,
    runAt: value.runAt ?? null,
  });
}

function timezoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  const representedAsUtc = Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second);
  return representedAsUtc - date.getTime();
}

function zonedDate(year: number, month: number, day: number, hour: number, minute: number, timeZone: string): Date {
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let result = new Date(naiveUtc);
  for (let iteration = 0; iteration < 3; iteration += 1) result = new Date(naiveUtc - timezoneOffsetMs(result, timeZone));
  return result;
}

function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  const weekdays: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { year: Number(values.year), month: Number(values.month), day: Number(values.day), hour: Number(values.hour), minute: Number(values.minute), weekday: weekdays[values.weekday] };
}

function daysInMonth(year: number, month: number): number { return new Date(Date.UTC(year, month, 0)).getUTCDate(); }

export function calculateNextRun(schedule: ScheduleInput, after = new Date()): Date | null {
  if (schedule.frequency === "one_time") return schedule.runAt && schedule.runAt > after ? schedule.runAt : null;
  const current = localParts(after, schedule.timezone);
  const candidateFor = (year: number, month: number, day: number) => zonedDate(year, month, day, schedule.hour, schedule.minute, schedule.timezone);

  if (schedule.frequency === "daily") {
    let candidate = candidateFor(current.year, current.month, current.day);
    if (candidate <= after) candidate = new Date(candidate.getTime() + 24 * 60 * 60 * 1000);
    return candidate;
  }
  if (schedule.frequency === "weekly") {
    let daysAhead = (schedule.dayOfWeek - current.weekday + 7) % 7;
    let candidate = candidateFor(current.year, current.month, current.day + daysAhead);
    if (candidate <= after) { daysAhead += 7; candidate = candidateFor(current.year, current.month, current.day + daysAhead); }
    return candidate;
  }

  const addMonths = schedule.frequency === "monthly" ? 1 : schedule.frequency === "quarterly" ? 3 : 12;
  let year = current.year;
  let month = schedule.frequency === "yearly" ? schedule.monthOfYear : current.month;
  let day = Math.min(schedule.dayOfMonth, daysInMonth(year, month));
  let candidate = candidateFor(year, month, day);
  if (candidate <= after) {
    month += addMonths;
    while (month > 12) { month -= 12; year += 1; }
    day = Math.min(schedule.dayOfMonth, daysInMonth(year, month));
    candidate = candidateFor(year, month, day);
  }
  return candidate;
}

export async function assertReportExists(reportId: string) {
  const report = await ReportDefinition.findOne({ _id: reportId, isArchived: false }).select("_id name").lean();
  if (!report) throw new AppError("Selected report does not exist or is archived.", 404);
  return report;
}

export async function createScheduledReport(input: { name: string; description: string; reportId: string; format: "csv" | "xlsx" | "pdf"; recipients: string[]; schedule: ScheduleInput }, actorId: string) {
  await assertReportExists(input.reportId);
  const nextRunAt = calculateNextRun(input.schedule);
  if (!nextRunAt) throw new AppError("The schedule does not have a future execution time.", 400);
  const schedule = await ScheduledReport.create({ ...input, nextRunAt, createdBy: actorId, updatedBy: actorId });
  await ReportScheduleAudit.create({ scheduleId: schedule._id, action: "created", actorId, metadata: { nextRunAt, frequency: input.schedule.frequency } });
  return schedule;
}

export async function updateScheduledReport(id: string, input: Partial<{ name: string; description: string; reportId: string; format: "csv" | "xlsx" | "pdf"; recipients: string[]; schedule: ScheduleInput }>, actorId: string) {
  const schedule = await ScheduledReport.findOne({ _id: id, createdBy: actorId, deletedAt: null });
  if (!schedule) throw new AppError("Scheduled report not found.", 404);
  if (input.reportId) await assertReportExists(input.reportId);
  Object.assign(schedule, input, { updatedBy: actorId });
  if (input.schedule || schedule.status === "active") {
    const normalized = input.schedule ?? normalizeScheduleConfig(schedule.schedule);
    schedule.nextRunAt = calculateNextRun(normalized);
  }
  await schedule.save();
  await ReportScheduleAudit.create({ scheduleId: schedule._id, action: "updated", actorId, metadata: { fields: Object.keys(input), nextRunAt: schedule.nextRunAt } });
  return schedule;
}

export async function performScheduleAction(id: string, action: "pause" | "resume" | "run_now" | "archive" | "restore", actorId: string) {
  const schedule = await ScheduledReport.findOne({ _id: id, createdBy: actorId });
  if (!schedule) throw new AppError("Scheduled report not found.", 404);

  if (action === "run_now") {
    if (schedule.deletedAt) throw new AppError("Restore this schedule before running it.", 400);
    const job = await ReportJob.create({ scheduleId: schedule._id, reportId: schedule.reportId, source: "manual", format: schedule.format, recipients: schedule.recipients, status: "queued", scheduledFor: new Date(), requestedBy: actorId });
    schedule.lastJobId = job._id; await schedule.save();
    await ReportScheduleAudit.create({ scheduleId: schedule._id, jobId: job._id, action: "run_requested", actorId });
    return { schedule, job };
  }
  if (action === "pause") { schedule.status = "paused"; schedule.nextRunAt = null; }
  if (action === "resume") {
    if (schedule.deletedAt) throw new AppError("Restore this schedule before resuming it.", 400);
    const normalized = normalizeScheduleConfig(schedule.schedule);
    const next = calculateNextRun(normalized);
    if (!next) throw new AppError("This schedule has no future execution time.", 400);
    schedule.status = "active"; schedule.nextRunAt = next;
  }
  if (action === "archive") { schedule.status = "archived"; schedule.deletedAt = new Date(); schedule.nextRunAt = null; }
  if (action === "restore") {
    schedule.deletedAt = null; schedule.status = "paused"; schedule.nextRunAt = null;
  }
  schedule.updatedBy = actorId as never;
  await schedule.save();
  await ReportScheduleAudit.create({ scheduleId: schedule._id, action: action === "pause" ? "paused" : action === "resume" ? "resumed" : action === "archive" ? "archived" : "restored", actorId });
  return { schedule };
}
