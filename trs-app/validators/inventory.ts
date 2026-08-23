import { z } from "zod";

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid ID.");

const inventoryUnitSchema = z.enum([
  "kg",
  "g",
  "l",
  "ml",
  "piece",
  "packet",
  "box",
  "bottle",
]);

export const createInventoryItemSchema = z.object({
  name: z.string().trim().min(2).max(160),
  sku: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[A-Za-z0-9_-]+$/),
  category: z.string().trim().min(2).max(100),
  unit: inventoryUnitSchema,
  currentStock: z.number().min(0).default(0),
  reorderLevel: z.number().min(0).default(0),
  idealStockLevel: z.number().min(0).default(0),
  averageUnitCost: z.number().min(0).default(0),
  expiryTrackingEnabled: z.boolean().default(false),
  isActive: z.boolean().default(true),
  notes: z.string().trim().max(1000).default(""),
});

export const updateInventoryItemSchema =
  createInventoryItemSchema
    .omit({ currentStock: true, averageUnitCost: true })
    .partial();

export const createInventoryMovementSchema = z.object({
  inventoryItemId: objectId,
  type: z.enum([
    "opening",
    "purchase",
    "sale",
    "adjustment_in",
    "adjustment_out",
    "wastage",
    "return_in",
    "return_out",
  ]),
  quantity: z.number().positive(),
  unitCost: z.number().min(0).default(0),
  referenceType: z
    .enum([
      "manual",
      "order",
      "purchase",
      "return",
      "opening",
    ])
    .default("manual"),
  referenceId: objectId.nullable().default(null),
  reason: z.string().trim().max(500).default(""),
  batchNumber: z.string().trim().max(100).default(""),
  expiryDate: z.coerce.date().nullable().default(null),
});

const recipeIngredientSchema = z.object({
  inventoryItemId: objectId,
  quantity: z.number().positive(),
});

export const upsertMenuItemRecipeSchema = z.object({
  menuItemId: objectId,
  yieldQuantity: z.number().positive().default(1),
  ingredients: z
    .array(recipeIngredientSchema)
    .min(1)
    .max(100),
  isActive: z.boolean().default(true),
});
