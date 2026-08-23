import { z } from "zod";

export const inventoryAutomationJobTypeSchema = z.enum([
  "alert_scan",
  "daily_summary",
  "weekly_report",
  "monthly_valuation",
  "expiry_report",
  "consumption_report",
  "abc_analysis",
]);

export const inventoryAutomationRunSchema = z.object({
  jobType: inventoryAutomationJobTypeSchema,
  payload: z.record(z.string(), z.unknown()).optional().default({}),
  maxAttempts: z.coerce.number().int().min(1).max(10).optional().default(3),
});

export const inventoryScheduledReportCreateSchema = z.object({
  name: z.string().trim().min(2).max(160),
  reportType: z.enum([
    "valuation",
    "stock_ledger",
    "consumption",
    "expiry",
    "abc_analysis",
  ]),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  recipients: z.array(z.string().email()).max(25).optional().default([]),
  filters: z.record(z.string(), z.unknown()).optional().default({}),
  format: z.enum(["csv", "xlsx", "pdf"]).optional().default("csv"),
  nextRunAt: z.coerce.date(),
  enabled: z.boolean().optional().default(true),
});

export const inventoryScheduledReportUpdateSchema =
  inventoryScheduledReportCreateSchema.partial();

export const inventoryAutomationHistoryQuerySchema = z.object({
  status: z
    .enum(["queued", "running", "completed", "failed", "cancelled"])
    .optional(),
  jobType: inventoryAutomationJobTypeSchema.optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
});
