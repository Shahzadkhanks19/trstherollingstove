import { z } from "zod";

const allocationSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  revenueBudget: z.coerce.number().min(0),
  expenseBudget: z.coerce.number().min(0),
  capitalBudget: z.coerce.number().min(0).default(0),
  notes: z.string().trim().max(500).default(""),
});
const budgetBaseSchema = z.object({
  name: z.string().trim().min(2).max(120),
  fiscalYear: z.coerce.number().int().min(2020).max(2200),
  department: z.string().trim().min(2).max(80).default("Company"),
  scenario: z.enum(["base", "optimistic", "conservative"]).default("base"),
  allocations: z.array(allocationSchema).min(1).max(12),
  assumptions: z.array(z.string().trim().min(1).max(250)).max(20).default([]),
  growthRate: z.coerce.number().min(-100).max(1000).default(0),
  inflationRate: z.coerce.number().min(-100).max(1000).default(0),
});
export const budgetCreateSchema = budgetBaseSchema.superRefine((value, context) => {
  if (new Set(value.allocations.map((item) => item.month)).size !== value.allocations.length) context.addIssue({ code: "custom", path: ["allocations"], message: "Allocation months must be unique." });
  if (value.allocations.some((item) => !item.month.startsWith(String(value.fiscalYear)))) context.addIssue({ code: "custom", path: ["allocations"], message: "Allocation months must match the fiscal year." });
});
export const budgetUpdateSchema = budgetBaseSchema.partial();
export const budgetApprovalSchema = z.object({ action: z.enum(["submit", "approve", "reject", "archive"]), reason: z.string().trim().max(500).optional() });
export const budgetForecastQuerySchema = z.object({ fiscalYear: z.coerce.number().int().min(2020).max(2200).default(new Date().getUTCFullYear()), scenario: z.enum(["base", "optimistic", "conservative"]).default("base"), department: z.string().trim().min(2).max(80).default("Company") });
export const budgetForecastRebuildSchema = budgetForecastQuerySchema.extend({ source: z.enum(["manual", "scheduled", "system"]).default("manual") });
