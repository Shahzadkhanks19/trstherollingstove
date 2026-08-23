import { z } from "zod";

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid ID.");

export const inventoryAlertTypeSchema = z.enum([
  "low_stock",
  "reorder",
  "near_expiry",
  "expired",
  "overstock",
  "negative_stock",
  "slow_moving",
  "dead_stock",
]);

export const createInventoryAlertRuleSchema = z.object({
  name: z.string().trim().min(2).max(160),
  type: inventoryAlertTypeSchema,
  enabled: z.boolean().default(true),
  threshold: z.number().min(0).default(0),
  inventoryItemId: objectId.nullable().default(null),
  warehouseId: objectId.nullable().default(null),
  notificationChannels: z
    .array(z.enum(["dashboard", "email", "whatsapp"]))
    .min(1)
    .default(["dashboard"]),
  cooldownHours: z.number().int().min(1).max(720).default(24),
});

export const updateInventoryAlertRuleSchema =
  createInventoryAlertRuleSchema.partial();

export const inventoryAlertEventActionSchema = z.object({
  action: z.enum(["acknowledge", "resolve", "reopen"]),
  note: z.string().trim().max(1000).default(""),
});

export const inventoryAlertScanSchema = z.object({
  ruleIds: z.array(objectId).max(100).optional(),
});

export const inventoryReportTypeSchema = z.enum([
  "valuation",
  "consumption",
  "expiry",
  "abc_analysis",
  "stock_ledger",
]);

export const inventoryReportQuerySchema = z.object({
  type: inventoryReportTypeSchema.default("valuation"),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  inventoryItemId: objectId.optional(),
  search: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(5000).default(500),
});

export const createInventoryReportRequestSchema = z.object({
  reportType: inventoryReportTypeSchema,
  format: z.enum(["json", "csv"]).default("csv"),
  filters: z
    .object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
      inventoryItemId: objectId.optional(),
      search: z.string().trim().max(120).optional(),
      limit: z.number().int().min(1).max(5000).optional(),
    })
    .default({}),
});
