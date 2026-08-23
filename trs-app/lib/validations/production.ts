import { z } from "zod";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid MongoDB id.");

const lineSchema = z.object({
  inventoryItemId: objectIdSchema,
  nameSnapshot: z.string().trim().min(1).max(200),
  unitSnapshot: z.string().trim().min(1).max(40),
  plannedQuantity: z.coerce.number().nonnegative(),
  actualQuantity: z.coerce.number().nonnegative().default(0),
  unitCost: z.coerce.number().nonnegative().default(0),
});

export const createProductionOrderSchema = z.object({
  title: z.string().trim().min(2).max(160),
  notes: z.string().trim().max(2000).default(""),
  warehouseId: objectIdSchema,
  recipeId: objectIdSchema.nullable().optional(),
  plannedStartAt: z.coerce.date().nullable().optional(),
  plannedEndAt: z.coerce.date().nullable().optional(),
  plannedYield: z.coerce.number().positive(),
  yieldUnit: z.string().trim().min(1).max(40),
  inputs: z.array(lineSchema).min(1),
  outputs: z.array(lineSchema).min(1),
});

export const updateProductionOrderSchema =
  createProductionOrderSchema.partial();

export const productionOrderActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("start") }),
  z.object({
    action: z.literal("complete"),
    actualYield: z.coerce.number().nonnegative(),
    inputs: z.array(lineSchema).min(1),
    outputs: z.array(lineSchema).min(1),
  }),
  z.object({
    action: z.literal("cancel"),
    reason: z.string().trim().min(3).max(500),
  }),
]);
