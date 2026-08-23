import { z } from "zod";

export const forecastGovernanceQuerySchema = z.object({
  limit: z.coerce.number().int().min(5).max(100).default(30),
});

export const forecastGovernanceActionSchema = z.object({
  runId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid forecast run ID."),
  action: z.enum(["approve", "publish", "unpublish", "archive", "restore", "recalculate_accuracy", "update_notes"]),
  notes: z.string().trim().max(1000).default(""),
});
