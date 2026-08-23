import { z } from "zod";

const objectId = z.string().trim().regex(/^[a-f\d]{24}$/i, "Invalid id.");
const timezone = z.string().trim().min(1).max(80).refine((value) => {
  try { new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date()); return true; }
  catch { return false; }
}, "Invalid IANA timezone.");

export const scheduledReportScheduleSchema = z.object({
  frequency: z.enum(["one_time", "daily", "weekly", "monthly", "quarterly", "yearly"]),
  timezone: timezone.default("Asia/Kolkata"),
  hour: z.number().int().min(0).max(23).default(9),
  minute: z.number().int().min(0).max(59).default(0),
  dayOfWeek: z.number().int().min(0).max(6).default(1),
  dayOfMonth: z.number().int().min(1).max(28).default(1),
  monthOfYear: z.number().int().min(1).max(12).default(1),
  runAt: z.coerce.date().nullable().default(null),
}).superRefine((value, context) => {
  if (value.frequency === "one_time" && !value.runAt) {
    context.addIssue({ code: "custom", path: ["runAt"], message: "Run date and time are required for a one-time schedule." });
  }
});

export const scheduledReportCreateSchema = z.object({
  name: z.string().trim().min(2).max(140),
  description: z.string().trim().max(500).default(""),
  reportId: objectId,
  format: z.enum(["csv", "xlsx", "pdf"]).default("pdf"),
  recipients: z.array(z.string().trim().email()).max(25).default([]),
  schedule: scheduledReportScheduleSchema,
});

export const scheduledReportUpdateSchema = scheduledReportCreateSchema.partial();
export const scheduledReportActionSchema = z.object({ action: z.enum(["pause", "resume", "run_now", "archive", "restore"]) });
