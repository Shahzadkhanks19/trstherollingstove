import { z } from "zod";

export const executiveBIIntelligenceQuerySchema = z.object({
  lookbackDays: z.coerce.number().int().min(14).max(180).default(30),
  refresh: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  format: z.enum(["json", "csv", "xlsx", "pdf"]).default("json"),
});
