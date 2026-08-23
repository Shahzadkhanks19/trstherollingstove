import { z } from "zod";

export const enterpriseHealthRunSchema = z.object({
  source: z.enum(["manual", "scheduled", "api"]).default("manual"),
});

export const enterpriseMaintenanceSchema = z.object({
  action: z.enum(["cleanup-expired-cache", "release-stale-jobs"]),
  dryRun: z.boolean().default(true),
  staleMinutes: z.number().int().min(15).max(1440).default(60),
});
