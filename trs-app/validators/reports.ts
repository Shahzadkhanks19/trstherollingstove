import { z } from "zod";

const dateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format.");

export const reportRangeQuerySchema = z.object({
  from: dateString.optional(),
  to: dateString.optional(),
  source: z
    .enum(["website", "pos", "admin"])
    .optional(),
  fulfilmentType: z
    .enum(["dine_in", "pickup"])
    .optional(),
  status: z.string().trim().min(1).max(60).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

export const reportExportQuerySchema = z.object({
  report: z.enum([
    "sales",
    "orders",
    "menu-performance",
    "customers",
    "inventory",
    "purchases",
  ]),
  from: dateString.optional(),
  to: dateString.optional(),
});
