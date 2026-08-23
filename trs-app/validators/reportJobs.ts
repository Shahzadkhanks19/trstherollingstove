import { z } from "zod";

export const reportJobQuerySchema = z.object({
  status: z.enum(["queued", "processing", "completed", "failed", "cancelled"]).optional(),
  source: z.enum(["scheduled", "manual"]).optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const reportJobActionSchema = z.object({
  action: z.enum(["retry", "cancel"]),
});

export const reportWorkerRunSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
