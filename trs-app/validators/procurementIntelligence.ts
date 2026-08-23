import { z } from "zod";

export const procurementIntelligenceQuerySchema = z.object({
  lookbackDays: z.coerce.number().int().min(14).max(730).default(90),
  horizonDays: z.coerce.number().int().min(1).max(180).default(30),
  leadTimeDays: z.coerce.number().int().min(1).max(90).default(7),
  refresh: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  format: z.enum(["json", "csv", "xlsx", "pdf"]).default("json"),
});
