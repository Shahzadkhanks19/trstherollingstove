import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const CouponSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 30,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    couponChannel: {
      type: String,
      enum: ["spin_wheel_only", "public_offer"],
      default: "public_offer",
      required: true,
      index: true,
    },
    publicOfferPlacement: {
      type: String,
      enum: ["permanent", "everyday"],
      default: "permanent",
      required: true,
      index: true,
    },
    discountType: {
      type: String,
      required: true,
      enum: ["percentage", "fixed", "free_item"],
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator(this: { discountType?: string }, value: number) {
          return this.discountType === "free_item" ? value === 0 : value > 0;
        },
        message: "Discount value is invalid for the selected discount type.",
      },
    },
    freeMenuItemId: {
      type: Schema.Types.ObjectId,
      ref: "MenuItem",
      default: null,
      required(this: { discountType?: string }) {
        return this.discountType === "free_item";
      },
    },
    maxDiscountAmount: { type: Number, min: 0, default: null },
    minimumOrderAmount: { type: Number, min: 0, default: 0 },
    usageLimit: { type: Number, min: 1, default: null },
    usageLimitPerCustomer: { type: Number, min: 1, default: 1 },
    usedCount: { type: Number, min: 0, default: 0 },
    startsAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    applicableOrderModes: {
      type: [String],
      enum: ["dine_in", "takeaway"],
      default: ["dine_in", "takeaway"],
    },
    applicableCategoryIds: {
      type: [Schema.Types.ObjectId],
      ref: "MenuCategory",
      default: [],
    },
    applicableMenuItemIds: {
      type: [Schema.Types.ObjectId],
      ref: "MenuItem",
      default: [],
    },
    excludedMenuItemIds: {
      type: [Schema.Types.ObjectId],
      ref: "MenuItem",
      default: [],
    },
    firstOrderOnly: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
    deletedAt: { type: Date, default: null, index: true },
    deletedCodeSnapshot: { type: String, trim: true, maxlength: 30, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, versionKey: false },
);

CouponSchema.index({ couponChannel: 1, publicOfferPlacement: 1, isActive: 1, startsAt: 1, expiresAt: 1 });

export function buildArchivedCouponCode(couponId: string): string {
  return `D_${couponId.slice(-24).toUpperCase()}`;
}

export type CouponDocument = InferSchemaType<typeof CouponSchema>;
export const Coupon: Model<CouponDocument> =
  (models.Coupon as Model<CouponDocument>) ||
  model<CouponDocument>("Coupon", CouponSchema);
