import { z } from "zod";

const objectId = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, "Select a valid menu item.");

const couponBaseSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[A-Za-z0-9_-]+$/)
    .transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).default(""),
  couponChannel: z.enum(["spin_wheel_only", "public_offer"]).default("public_offer"),
  publicOfferPlacement: z.enum(["permanent", "everyday"]).default("permanent"),
  discountType: z.enum(["percentage", "fixed", "free_item"]),
  discountValue: z.number().min(0),
  freeMenuItemId: objectId.nullable().optional(),
  maxDiscountAmount: z.number().min(0).nullable().optional(),
  minimumOrderAmount: z.number().min(0).default(0),
  usageLimit: z.number().int().positive().nullable().optional(),
  usageLimitPerCustomer: z.number().int().positive().default(1),
  startsAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  applicableOrderModes: z
    .array(z.enum(["dine_in", "takeaway"]))
    .min(1)
    .default(["dine_in", "takeaway"]),
  applicableCategoryIds: z.array(objectId).default([]),
  applicableMenuItemIds: z.array(objectId).default([]),
  excludedMenuItemIds: z.array(objectId).default([]),
  firstOrderOnly: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

function validateCouponConfiguration(
  value: {
    discountType?: "percentage" | "fixed" | "free_item";
    discountValue?: number;
    freeMenuItemId?: string | null;
    startsAt?: string;
    expiresAt?: string;
  },
  context: z.RefinementCtx,
) {
  if (value.discountType === "free_item") {
    if (!value.freeMenuItemId) {
      context.addIssue({
        code: "custom",
        path: ["freeMenuItemId"],
        message: "Select the menu item that should become free.",
      });
    }

    if (value.discountValue !== undefined && value.discountValue !== 0) {
      context.addIssue({
        code: "custom",
        path: ["discountValue"],
        message: "Free-item coupons must use a discount value of 0.",
      });
    }
  } else if (value.discountType) {
    if (value.discountValue === undefined || value.discountValue <= 0) {
      context.addIssue({
        code: "custom",
        path: ["discountValue"],
        message: "Discount value must be greater than 0.",
      });
    }

    if (value.discountType === "percentage" && (value.discountValue ?? 0) > 100) {
      context.addIssue({
        code: "custom",
        path: ["discountValue"],
        message: "Percentage discount cannot exceed 100.",
      });
    }
  }

  if (value.startsAt && value.expiresAt) {
    if (new Date(value.expiresAt) <= new Date(value.startsAt)) {
      context.addIssue({
        code: "custom",
        path: ["expiresAt"],
        message: "Coupon expiry must be after its start time.",
      });
    }
  }
}

export const couponCreateSchema = couponBaseSchema
  .superRefine(validateCouponConfiguration)
  .refine((value) => new Date(value.expiresAt).getTime() > Date.now(), {
    message: "Coupon expiry must be in the future.",
    path: ["expiresAt"],
  });

export const couponUpdateSchema = couponBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field.",
  })
  .superRefine(validateCouponConfiguration);

export const applyCouponSchema = z.object({
  code: z.string().trim().min(3).max(30).transform((value) => value.toUpperCase()),
});

export const redeemCoinsSchema = z.object({
  coins: z.number().int().positive().max(100000),
});

export const coinAdjustmentSchema = z.object({
  customerId: objectId,
  amount: z.number().int().refine((value) => value !== 0, {
    message: "Amount cannot be zero.",
  }),
  description: z.string().trim().min(3).max(300),
});
