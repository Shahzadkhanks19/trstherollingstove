import { z } from "zod";

export const financialReportRangeSchema = z.object({
  days: z.coerce.number().int().min(1).max(3650).default(30),
});

export const financialReportRebuildSchema = financialReportRangeSchema.extend({
  source: z.enum(["manual", "scheduled", "system"]).default("manual"),
});
