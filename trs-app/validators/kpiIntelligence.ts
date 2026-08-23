import { z } from "zod";
export const kpiIntelligenceQuerySchema = z.object({
  lookbackDays: z.coerce.number().int().min(14).max(365).default(30),
  refresh: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  format: z.enum(["json", "csv", "xlsx", "pdf"]).default("json"),
});
