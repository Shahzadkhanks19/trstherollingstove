import { z } from "zod";

import {
  AUDIT_OUTCOMES,
  AUDIT_SEVERITIES,
  SECURITY_EVENT_TYPES,
} from "@/types/audit";

export const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20),
  search: z.string().trim().max(200).optional(),
  module: z.string().trim().max(100).optional(),
  action: z.string().trim().max(160).optional(),
  severity: z.enum(AUDIT_SEVERITIES).optional(),
  outcome: z.enum(AUDIT_OUTCOMES).optional(),
  actorId: z.string().trim().max(100).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export const securityEventQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20),
  search: z.string().trim().max(200).optional(),
  eventType: z
    .enum(SECURITY_EVENT_TYPES)
    .optional(),
  severity: z.enum(AUDIT_SEVERITIES).optional(),
  resolved: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export const resolveSecurityEventSchema = z.object({
  resolutionNote: z
    .string()
    .trim()
    .min(3)
    .max(1000),
});
