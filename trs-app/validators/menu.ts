import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier.");
const urlField = z.string().max(500).refine(
  (value) => value === "" || value.startsWith("/uploads/") || z.url().safeParse(value).success,
  "Enter a valid image URL.",
);
const timeField = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time. Use HH:mm.");

const variantSchema = z.object({
  name: z.string().trim().min(1).max(80),
  sku: z.string().trim().max(60).default(""),
  price: z.number().min(0),
  compareAtPrice: z.number().min(0).nullable().optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const availabilityWindowSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: timeField,
    endTime: timeField,
  })
  .refine((value) => value.startTime < value.endTime, {
    message: "End time must be later than start time.",
    path: ["endTime"],
  });

const categoryBaseSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().max(100).optional(),
  description: z.string().trim().max(500).default(""),
  imageUrl: urlField.default(""),
  iconUrl: urlField.default(""),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
});

export const categoryCreateSchema = categoryBaseSchema;

export const categoryUpdateSchema = categoryBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field.",
  });

const taxClassBaseSchema = z.object({
  name: z.string().trim().min(2).max(80),
  code: z
    .string()
    .trim()
    .min(2)
    .max(30)
    .transform((value) => value.toUpperCase()),
  percentage: z.number().min(0).max(100),
  isInclusive: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export const taxClassCreateSchema = taxClassBaseSchema;

export const taxClassUpdateSchema = taxClassBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field.",
  });

const modifierVariantPriceSchema = z.object({
  variantLabel: z.string().trim().min(1).max(80),
  price: z.number().min(0),
});

const modifierOptionSchema = z.object({
  name: z.string().trim().min(1).max(80),
  price: z.number().min(0).default(0),
  variantPrices: z.array(modifierVariantPriceSchema).max(30).default([]),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  isAvailable: z.boolean().default(true),
  maxQuantity: z.number().int().min(1).max(50).default(1),
  sortOrder: z.number().int().default(0),
});

const modifierGroupBaseSchema = z.object({
  name: z.string().trim().min(2).max(80),
  internalName: z.string().trim().min(2).max(100),
  selectionType: z.enum(["single", "multiple", "quantity"]),
  isRequired: z.boolean().default(false),
  minSelections: z.number().int().min(0).default(0),
  maxSelections: z.number().int().min(1).default(1),
  options: z.array(modifierOptionSchema).max(100).default([]),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

function validModifierSelectionRange(value: {
  minSelections?: number;
  maxSelections?: number;
}) {
  if (
    value.minSelections === undefined ||
    value.maxSelections === undefined
  ) {
    return true;
  }

  return value.maxSelections >= value.minSelections;
}

export const modifierGroupCreateSchema = modifierGroupBaseSchema.refine(
  validModifierSelectionRange,
  {
    message:
      "Maximum selections must be greater than or equal to minimum selections.",
    path: ["maxSelections"],
  },
);

export const modifierGroupUpdateSchema = modifierGroupBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field.",
  })
  .refine(validModifierSelectionRange, {
    message:
      "Maximum selections must be greater than or equal to minimum selections.",
    path: ["maxSelections"],
  });

const combinationPriceEntrySchema = z.object({
  variantLabel: z.string().trim().min(1).max(80),
  optionId: objectId,
  optionName: z.string().trim().min(1).max(80),
  price: z.number().min(0),
});

const combinationPricingSchema = z.object({
  enabled: z.boolean().default(false),
  modifierGroupId: objectId.nullable().default(null),
  entries: z.array(combinationPriceEntrySchema).max(100).default([]),
}).superRefine((value, context) => {
  if (!value.enabled) return;
  if (!value.modifierGroupId) {
    context.addIssue({ code: "custom", message: "Select the combination-pricing modifier group.", path: ["modifierGroupId"] });
  }
  if (value.entries.length === 0) {
    context.addIssue({ code: "custom", message: "Add combination prices.", path: ["entries"] });
  }
});

const pizzaConfigurationSchema = z.object({
  thinCrustAvailable: z.boolean().default(true),
  thinCrustPriceAdjustment: z.number().min(0).default(0),
});

const menuItemBaseSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().max(140).optional(),
  shortDescription: z.string().trim().max(250).default(""),
  description: z.string().trim().max(2000).default(""),
  categoryId: objectId,
  taxClassId: objectId.nullable().optional(),
  imageUrl: urlField.default(""),
  galleryUrls: z.array(urlField).max(12).default([]),
  basePrice: z.number().min(0),
  compareAtPrice: z.number().min(0).nullable().optional(),
  variants: z.array(variantSchema).max(30).default([]),
  combinationPricing: combinationPricingSchema.default({ enabled: false, modifierGroupId: null, entries: [] }),
  pizzaConfiguration: pizzaConfigurationSchema.default({ thinCrustAvailable: true, thinCrustPriceAdjustment: 0 }),
  modifierGroupIds: z
    .array(objectId)
    .max(30)
    .default([])
    .transform((ids) => [...new Set(ids)]),
  frequentlyOrderedWithIds: z
    .array(objectId)
    .max(12)
    .default([])
    .transform((ids) => [...new Set(ids)]),
  spiceLevel: z.enum(["none", "mild", "medium", "hot"]).default("none"),
  preparationTimeMinutes: z.number().int().min(0).max(240).default(15),
  calories: z.number().min(0).nullable().optional(),
  allergens: z
    .array(z.string().trim().min(1).max(50))
    .max(30)
    .default([]),
  tags: z
    .array(z.string().trim().min(1).max(50))
    .max(30)
    .default([]),
  availabilityWindows: z
    .array(availabilityWindowSchema)
    .max(30)
    .default([]),
  availableForDineIn: z.boolean().default(true),
  availableForTakeaway: z.boolean().default(true),
  isAvailable: z.boolean().default(true),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isBestseller: z.boolean().default(false),
  isCombo: z.boolean().default(false),
  comboComponents: z.array(z.object({ menuItemId: objectId, variantId: objectId.nullable().optional(), quantity: z.number().int().min(1).max(50) })).max(50).default([]),
  comboOfferType: z.enum(["permanent", "limited"]).default("permanent"),
  comboOfferStartsAt: z.iso.datetime().nullable().optional(),
  comboOfferExpiresAt: z.iso.datetime().nullable().optional(),
  publishComboOnMenuPage: z.boolean().default(true),
  publishComboOnOffersPage: z.boolean().default(false),
  comboOffersPageSection: z.enum(["permanent", "todays"]).default("permanent"),
  eligibleTierKeys: z.array(z.enum(["bronze", "silver", "gold", "platinum"])).min(1).max(4).default(["bronze", "silver", "gold", "platinum"]),
  isTodaysSpecialOffer: z.boolean().default(false),
  todaysSpecialOfferStartsAt: z.iso.datetime().nullable().optional(),
  trackInventory: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

function validateComboOffer(value: { isCombo?: boolean; comboOfferType?: "permanent" | "limited"; comboOfferStartsAt?: string | null; comboOfferExpiresAt?: string | null; comboOffersPageSection?: "permanent" | "todays"; publishComboOnOffersPage?: boolean }, context: z.RefinementCtx) {
  if (!value.isCombo) return;
  if (value.comboOfferType === "limited" && (!value.comboOfferStartsAt || !value.comboOfferExpiresAt)) {
    context.addIssue({ code: "custom", path: ["comboOfferExpiresAt"], message: "Limited-time combos require start and expiry dates." });
  }
  if (value.comboOfferStartsAt && value.comboOfferExpiresAt && new Date(value.comboOfferExpiresAt) <= new Date(value.comboOfferStartsAt)) {
    context.addIssue({ code: "custom", path: ["comboOfferExpiresAt"], message: "Combo expiry must be after its start date." });
  }
}

function validateTodaysSpecialOffer(
  value: { isTodaysSpecialOffer?: boolean; todaysSpecialOfferStartsAt?: string | null },
  context: z.RefinementCtx,
) {
  if (value.isTodaysSpecialOffer && !value.todaysSpecialOfferStartsAt) {
    context.addIssue({
      code: "custom",
      path: ["todaysSpecialOfferStartsAt"],
      message: "Select when the 24-hour special offer should start.",
    });
  }
}

export const menuItemCreateSchema =
  menuItemBaseSchema.superRefine(validateTodaysSpecialOffer).superRefine(validateComboOffer);

export const menuItemUpdateSchema = menuItemBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field.",
  })
  .superRefine(validateTodaysSpecialOffer)
  .superRefine(validateComboOffer);

export const menuBulkActionSchema = z
  .object({
    itemIds: z.array(objectId).min(1).max(100),
    action: z.enum([
      "activate",
      "deactivate",
      "mark_available",
      "mark_unavailable",
      "feature",
      "unfeature",
      "mark_bestseller",
      "remove_bestseller",
      "apply_discount",
      "remove_discount",
    ]),
    discountType: z.enum(["percentage", "fixed"]).optional(),
    discountValue: z.number().positive().optional(),
  })
  .superRefine((value, context) => {
    if (value.action !== "apply_discount") return;

    if (!value.discountType) {
      context.addIssue({
        code: "custom",
        path: ["discountType"],
        message: "Select percentage or fixed-amount discount.",
      });
    }

    if (value.discountValue == null) {
      context.addIssue({
        code: "custom",
        path: ["discountValue"],
        message: "Enter a discount value.",
      });
      return;
    }

    if (value.discountType === "percentage" && value.discountValue >= 100) {
      context.addIssue({
        code: "custom",
        path: ["discountValue"],
        message: "Percentage discount must be less than 100%.",
      });
    }
  });
