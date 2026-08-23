import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier.");

const selectedModifierSchema = z.object({
  groupId: objectId,
  optionId: objectId,
});

export const addCartItemSchema = z.object({
  menuItemId: objectId,
  variantId: objectId.nullable().optional(),
  modifiers: z.array(selectedModifierSchema).max(30).default([]),
  quantity: z.number().int().min(1).max(50).default(1),
  specialInstructions: z.string().trim().max(500).default(""),
});

const cartItemUpdateBaseSchema = z.object({
  variantId: objectId.nullable().optional(),
  modifiers: z.array(selectedModifierSchema).max(30).optional(),
  quantity: z.number().int().min(1).max(50).optional(),
  specialInstructions: z.string().trim().max(500).optional(),
});

export const updateCartItemSchema = cartItemUpdateBaseSchema.refine(
  (value) => Object.keys(value).length > 0,
  { message: "Provide at least one field." },
);

const cartPreferencesBaseSchema = z.object({
  orderMode: z.enum(["dine_in", "takeaway"]).optional(),
  tableNumber: z.string().trim().max(30).optional(),
  requestedPickupAt: z.iso.datetime().nullable().optional(),
  customerNote: z.string().trim().max(500).optional(),
});

export const updateCartPreferencesSchema = cartPreferencesBaseSchema.refine(
  (value) => Object.keys(value).length > 0,
  { message: "Provide at least one field." },
);

export const checkoutSchema = z
  .object({
    orderMode: z.enum(["dine_in", "takeaway"]),
    tableNumber: z.string().trim().max(30).default(""),
    requestedPickupAt: z.iso.datetime().nullable().optional(),
    customerNote: z.string().trim().max(500).default(""),
    paymentMethod: z.literal("online").default("online"),
    couponCode: z
      .string()
      .trim()
      .max(30)
      .transform((value) => value.toUpperCase())
      .optional(),
    coinsToRedeem: z.number().int().min(0).max(100000).default(0),
  })
  .superRefine((value, context) => {
    if (!value.requestedPickupAt) {
      context.addIssue({
        code: "custom",
        path: ["requestedPickupAt"],
        message: "Select an order time.",
      });
    }
  });

export const orderStatusUpdateSchema = z
  .object({
    status: z.enum([
      "accepted",
      "preparing",
      "ready",
      "completed",
      "cancelled",
      "rejected",
    ]),
    note: z.string().trim().max(500).default(""),
    estimatedReadyAt: z.iso.datetime().nullable().optional(),
  })
  .superRefine((value, context) => {
    if (
      (value.status === "cancelled" || value.status === "rejected") &&
      value.note.length < 3
    ) {
      context.addIssue({
        code: "custom",
        path: ["note"],
        message: "A cancellation or rejection reason is required.",
      });
    }

    if (value.estimatedReadyAt) {
      const estimatedReadyAt = new Date(value.estimatedReadyAt);
      if (estimatedReadyAt.getTime() <= Date.now()) {
        context.addIssue({
          code: "custom",
          path: ["estimatedReadyAt"],
          message: "Estimated ready time must be in the future.",
        });
      }
    }
  });

export const paymentStatusUpdateSchema = z.object({
  paymentStatus: z.enum(["pending", "paid", "failed", "refunded"]),
  paymentMethod: z.enum(["cash", "upi", "card", "online", "split"]).optional(),
});
