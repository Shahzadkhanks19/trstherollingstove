import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID.");
const itemLine = z.object({ inventoryItemId: objectId, quantity: z.number().positive().max(1_000_000), batchNumber: z.string().trim().max(100).default("") });

export const createPurchaseReturnSchema = z.object({
  supplierId: objectId,
  purchaseOrderId: objectId.nullable().default(null),
  supplierCreditExpected: z.boolean().default(true),
  creditNoteNumber: z.string().trim().max(120).default(""),
  notes: z.string().trim().max(1000).default(""),
  items: z.array(itemLine.extend({ reason: z.string().trim().min(3).max(500) })).min(1).max(200),
}).superRefine((value, ctx) => {
  const ids = new Set(value.items.map((item) => item.inventoryItemId));
  if (ids.size !== value.items.length) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["items"], message: "Each item can only appear once." });
});

export const createStockTransferSchema = z.object({
  fromWarehouseId: objectId,
  toWarehouseId: objectId,
  notes: z.string().trim().max(1000).default(""),
  items: z.array(itemLine).min(1).max(200),
}).superRefine((value, ctx) => {
  if (value.fromWarehouseId === value.toWarehouseId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["toWarehouseId"], message: "Source and destination warehouses must be different." });
  const ids = new Set(value.items.map((item) => item.inventoryItemId));
  if (ids.size !== value.items.length) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["items"], message: "Each item can only appear once." });
});

export const createStockCountSchema = z.object({
  warehouseId: objectId.nullable().default(null),
  countType: z.enum(["full", "cycle", "spot"]).default("cycle"),
  notes: z.string().trim().max(1000).default(""),
  items: z.array(z.object({ inventoryItemId: objectId, countedQuantity: z.number().min(0).max(1_000_000), reason: z.string().trim().max(500).default("") })).min(1).max(1000),
});

export const createWasteEntrySchema = z.object({
  inventoryItemId: objectId,
  warehouseId: objectId.nullable().default(null),
  quantity: z.number().positive().max(1_000_000),
  wasteType: z.enum(["spoilage", "expiry", "damage", "production_loss", "theft", "other"]),
  batchNumber: z.string().trim().max(100).default(""),
  reason: z.string().trim().min(3).max(500),
  occurredAt: z.coerce.date().optional(),
});
