import { Schema, deleteModel, model, models, type InferSchemaType, type Model } from "mongoose";

const MenuVariantSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    sku: { type: String, trim: true, uppercase: true, maxlength: 60, default: "" },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0, default: null },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: true, versionKey: false },
);


const CombinationPriceEntrySchema = new Schema(
  {
    variantLabel: { type: String, required: true, trim: true, maxlength: 80 },
    optionId: { type: Schema.Types.ObjectId, required: true },
    optionName: { type: String, required: true, trim: true, maxlength: 80 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false, versionKey: false },
);

const CombinationPricingSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    modifierGroupId: { type: Schema.Types.ObjectId, ref: "ModifierGroup", default: null },
    entries: { type: [CombinationPriceEntrySchema], default: [] },
  },
  { _id: false, versionKey: false },
);

const PizzaConfigurationSchema = new Schema(
  {
    thinCrustAvailable: { type: Boolean, default: true },
    thinCrustPriceAdjustment: { type: Number, min: 0, default: 0 },
  },
  { _id: false, versionKey: false },
);

const AvailabilityWindowSchema = new Schema(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    endTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  },
  { _id: false, versionKey: false },
);


const ComboComponentSchema = new Schema(
  {
    menuItemId: { type: Schema.Types.ObjectId, ref: "MenuItem", required: true },
    variantId: { type: Schema.Types.ObjectId, default: null },
    quantity: { type: Number, required: true, min: 1, max: 50 },
    currentName: { type: String, trim: true, maxlength: 120, default: "" },
    currentVariantName: { type: String, trim: true, maxlength: 80, default: "" },
    currentUnitPrice: { type: Number, min: 0, default: 0 },
    isMissing: { type: Boolean, default: false },
  },
  { _id: false, versionKey: false },
);

const MenuItemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    shortDescription: { type: String, trim: true, maxlength: 250, default: "" },
    description: { type: String, trim: true, maxlength: 2000, default: "" },
    categoryId: { type: Schema.Types.ObjectId, ref: "MenuCategory", required: true, index: true },
    taxClassId: { type: Schema.Types.ObjectId, ref: "TaxClass", default: null },
    imageUrl: { type: String, trim: true, maxlength: 500, default: "" },
    galleryUrls: [{ type: String, trim: true, maxlength: 500 }],
    basePrice: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0, default: null },
    variants: { type: [MenuVariantSchema], default: [] },
    modifierGroupIds: [{ type: Schema.Types.ObjectId, ref: "ModifierGroup" }],
    frequentlyOrderedWithIds: [{ type: Schema.Types.ObjectId, ref: "MenuItem" }],
    combinationPricing: { type: CombinationPricingSchema, default: () => ({ enabled: false, modifierGroupId: null, entries: [] }) },
    pizzaConfiguration: { type: PizzaConfigurationSchema, default: () => ({ thinCrustAvailable: true, thinCrustPriceAdjustment: 0 }) },
    foodType: { type: String, enum: ["veg"], default: "veg" },
    spiceLevel: { type: String, enum: ["none", "mild", "medium", "hot"], default: "none" },
    preparationTimeMinutes: { type: Number, min: 0, max: 240, default: 15 },
    calories: { type: Number, min: 0, default: null },
    allergens: [{ type: String, trim: true, lowercase: true, maxlength: 50 }],
    tags: [{ type: String, trim: true, lowercase: true, maxlength: 50 }],
    availabilityWindows: { type: [AvailabilityWindowSchema], default: [] },
    availableForDineIn: { type: Boolean, default: true },
    availableForTakeaway: { type: Boolean, default: true },
    isAvailable: { type: Boolean, default: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    isBestseller: { type: Boolean, default: false, index: true },
    isCombo: { type: Boolean, default: false, index: true },
    comboComponents: { type: [ComboComponentSchema], default: [] },
    comboOriginalPrice: { type: Number, min: 0, default: null },
    comboSavings: { type: Number, min: 0, default: null },
    comboDiscountPercent: { type: Number, min: 0, default: null },
    comboOfferType: { type: String, enum: ["permanent", "limited"], default: "permanent" },
    comboOfferStartsAt: { type: Date, default: null },
    comboOfferExpiresAt: { type: Date, default: null },
    publishComboOnMenuPage: { type: Boolean, default: true },
    publishComboOnOffersPage: { type: Boolean, default: false, index: true },
    comboOffersPageSection: { type: String, enum: ["permanent", "todays"], default: "permanent" },
    eligibleTierKeys: { type: [String], enum: ["bronze", "silver", "gold", "platinum"], default: ["bronze", "silver", "gold", "platinum"] },
    isTodaysSpecialOffer: { type: Boolean, default: false, index: true },
    todaysSpecialOfferStartsAt: { type: Date, default: null, index: true },
    todaysSpecialOfferExpiresAt: { type: Date, default: null, index: true },
    trackInventory: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0, index: true },
    deletedAt: { type: Date, default: null, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true, versionKey: false },
);

MenuItemSchema.index({ categoryId: 1, isActive: 1, isAvailable: 1, sortOrder: 1 });
MenuItemSchema.index({ name: "text", shortDescription: "text", description: "text", tags: "text" });

export type MenuItemDocument = InferSchemaType<typeof MenuItemSchema>;

const existingMenuItemModel = models.MenuItem as Model<MenuItemDocument> | undefined;

// Next.js Fast Refresh can retain an older compiled Mongoose model after the
// schema gains new paths. Remove only that stale development model so populate
// sees the current schema instead of disabling strictPopulate globally.
if (
  existingMenuItemModel &&
  (!existingMenuItemModel.schema.path("modifierGroupIds") ||
    !existingMenuItemModel.schema.path("frequentlyOrderedWithIds") ||
    !existingMenuItemModel.schema.path("combinationPricing") ||
    !existingMenuItemModel.schema.path("pizzaConfiguration") ||
    !existingMenuItemModel.schema.path("isTodaysSpecialOffer") ||
    !existingMenuItemModel.schema.path("todaysSpecialOfferStartsAt") ||
    !existingMenuItemModel.schema.path("todaysSpecialOfferExpiresAt") ||
    !existingMenuItemModel.schema.path("comboComponents"))
) {
  deleteModel("MenuItem");
}

export const MenuItem: Model<MenuItemDocument> =
  (models.MenuItem as Model<MenuItemDocument> | undefined) ??
  model<MenuItemDocument>("MenuItem", MenuItemSchema);
