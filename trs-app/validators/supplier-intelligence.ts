import { z } from "zod";

export const supplierIntelligenceRunSchema = z.object({
  lookbackDays: z.coerce.number().int().min(30).max(1095).default(365),
  source: z.enum(["manual", "scheduled", "api"]).default("manual"),
});

export const supplierIntelligenceQuerySchema = z.object({
  runId: z.string().trim().optional(),
  grade: z.enum(["A", "B", "C", "D"]).optional(),
  preferredSupplier: z.enum(["true", "false"]).optional(),
  isActive: z.enum(["true", "false"]).optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
