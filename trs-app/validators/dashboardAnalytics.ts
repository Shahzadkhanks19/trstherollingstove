import { z } from "zod";

const dateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format.");

export const dashboardAnalyticsQuerySchema = z.object({
  from: dateString.optional(),
  to: dateString.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const dashboardSeriesQuerySchema = dashboardAnalyticsQuerySchema.extend({
  interval: z.enum(["hour", "day", "month"]).default("day"),
});
