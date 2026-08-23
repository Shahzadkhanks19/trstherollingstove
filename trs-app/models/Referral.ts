import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const ReferralSchema = new Schema(
  {
    referrerCustomerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    referredCustomerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    referralCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      maxlength: 20,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "signed_up",
        "first_order_pending",
        "order_completed",
        "rewarded",
        "under_review",
        "rejected",
        "expired",
      ],
      default: "signed_up",
      index: true,
    },
    firstOrderId: { type: Schema.Types.ObjectId, ref: "Order", default: null },
    signupCompletedAt: { type: Date, default: Date.now },
    firstOrderCompletedAt: { type: Date, default: null },
    rewardedAt: { type: Date, default: null },
    referrerRewardCoins: { type: Number, default: 75, min: 0 },
    friendCouponAmount: { type: Number, default: 50, min: 0 },
    rejectionReason: { type: String, trim: true, maxlength: 500, default: "" },
    fraudFlags: [{ type: String, trim: true, maxlength: 80 }],
  },
  { timestamps: true, versionKey: false },
);

ReferralSchema.index({ referrerCustomerId: 1, createdAt: -1 });
ReferralSchema.index({ referralCode: 1, status: 1 });

export type ReferralDocument = InferSchemaType<typeof ReferralSchema>;
export const Referral: Model<ReferralDocument> =
  (models.Referral as Model<ReferralDocument>) ||
  model<ReferralDocument>("Referral", ReferralSchema);
