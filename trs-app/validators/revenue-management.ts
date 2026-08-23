import { z } from "zod";

export const revenueRangeSchema = z.object({
  days: z.coerce.number().int().min(1).max(366).default(30),
});

export const revenueRebuildSchema = z.object({
  days: z.number().int().min(1).max(366).default(30),
  source: z.enum(["manual", "scheduled", "system"]).default("manual"),
});
