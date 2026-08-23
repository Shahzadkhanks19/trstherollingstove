import { z } from "zod";

export const businessForecastQuerySchema = z.object({
  lookbackDays: z.coerce.number().int().min(30).max(730).default(90),
  format: z.enum(["json", "csv", "xlsx", "pdf"]).default("json"),
  refresh: z.coerce.boolean().default(false),
});
