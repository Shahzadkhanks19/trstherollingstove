import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier.");

export const paymentManagementRangeSchema = z.object({
  days: z.coerce.number().int().min(1).max(3650).default(30),
});

export const paymentManagementRebuildSchema = paymentManagementRangeSchema.extend({
  source: z.enum(["manual", "scheduled", "system"]).default("manual"),
});

export const paymentRefundSchema = z.object({
  amount: z.coerce.number().positive(),
  providerRefundId: z.string().trim().max(180).default(""),
  reason: z.string().trim().min(3).max(500),
});

export const paymentReverseSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const paymentReconciliationSchema = z.object({
  paymentId: objectId,
  reconciliationType: z.enum(["gateway", "bank", "manual"]).default("manual"),
  settledAmount: z.coerce.number().min(0),
  settlementReference: z.string().trim().max(180).default(""),
  settledAt: z.coerce.date().nullable().optional(),
  notes: z.string().trim().max(1000).default(""),
});
