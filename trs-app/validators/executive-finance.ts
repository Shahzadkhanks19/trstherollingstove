import { z } from "zod";

export const executiveFinanceQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(3650).default(30),
  fiscalYear: z.coerce.number().int().min(2000).max(2200).default(new Date().getUTCFullYear()),
  scenario: z.enum(["base", "optimistic", "conservative"]).default("base"),
});

export const executiveFinanceRebuildSchema = executiveFinanceQuerySchema.extend({
  source: z.enum(["manual", "scheduled", "system"]).default("manual"),
});
