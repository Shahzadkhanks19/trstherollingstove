import { z } from "zod";

export const inventoryForecastRunSchema = z.object({
  lookbackDays: z.coerce.number().int().min(14).max(730).default(90),
  horizonDays: z.coerce.number().int().min(1).max(180).default(30),
  leadTimeDays: z.coerce.number().int().min(1).max(90).default(7),
  serviceLevelFactor: z.coerce.number().min(0.5).max(3).default(1.65),
  source: z.enum(["manual", "scheduled", "api"]).default("manual"),
});

export const inventoryForecastQuerySchema = z.object({
  runId: z.string().trim().optional(),
  riskLevel: z.enum(["critical", "high", "medium", "low"]).optional(),
  velocityClass: z.enum(["fast", "medium", "slow", "inactive"]).optional(),
  category: z.string().trim().max(100).optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
