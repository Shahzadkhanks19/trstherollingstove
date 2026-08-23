import { z } from "zod";

export const executiveBIRunSchema = z.object({
  periodPreset: z.enum(["today", "week", "month", "quarter", "year", "custom"]).default("month"),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  carryingCostAnnualPercent: z.coerce.number().min(0).max(100).default(20),
  deadStockDays: z.coerce.number().int().min(14).max(730).default(60),
  source: z.enum(["manual", "scheduled", "api"]).default("manual"),
}).superRefine((value, context) => {
  if (value.periodPreset === "custom" && (!value.startDate || !value.endDate)) {
    context.addIssue({ code: "custom", message: "Custom period requires startDate and endDate." });
  }
  if (value.startDate && value.endDate && value.startDate > value.endDate) {
    context.addIssue({ code: "custom", message: "startDate must be before endDate." });
  }
});
