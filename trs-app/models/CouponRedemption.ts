import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const CouponRedemptionSchema = new Schema(
  {
    couponId: {
      type: Schema.Types.ObjectId,
      ref: "Coupon",
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
      index: true,
    },
    codeSnapshot: { type: String, required: true, uppercase: true, trim: true },
    discountAmount: { type: Number, required: true, min: 0 },
    redeemedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true, versionKey: false },
);

CouponRedemptionSchema.index({ couponId: 1, customerId: 1 });

export type CouponRedemptionDocument = InferSchemaType<
  typeof CouponRedemptionSchema
>;
export const CouponRedemption: Model<CouponRedemptionDocument> =
  (models.CouponRedemption as Model<CouponRedemptionDocument>) ||
  model<CouponRedemptionDocument>(
    "CouponRedemption",
    CouponRedemptionSchema,
  );
