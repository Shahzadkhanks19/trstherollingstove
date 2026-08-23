import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const SpinWheelSpinSchema = new Schema(
  {
    campaignId: { type: Schema.Types.ObjectId, ref: "SpinWheelCampaign", required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    prizeId: { type: Schema.Types.ObjectId, required: true },
    prizeLabel: { type: String, required: true, trim: true, maxlength: 80 },
    prizeType: { type: String, enum: ["coins", "coupon", "try_again"], required: true },
    prizeValue: { type: Number, min: 0, default: 0 },
    couponCode: { type: String, trim: true, uppercase: true, maxlength: 30, default: "" },
    spinDateKey: { type: String, required: true, index: true },
    rewardStatus: { type: String, enum: ["granted", "not_applicable"], required: true, default: "granted", index: true },
    rewardGrantedAt: { type: Date, default: undefined },
  },
  { timestamps: true, versionKey: false },
);

SpinWheelSpinSchema.index({ campaignId: 1, customerId: 1, spinDateKey: 1, createdAt: -1 });

export type SpinWheelSpinDocument = InferSchemaType<typeof SpinWheelSpinSchema>;
export const SpinWheelSpin: Model<SpinWheelSpinDocument> =
  (models.SpinWheelSpin as Model<SpinWheelSpinDocument>) ||
  model<SpinWheelSpinDocument>("SpinWheelSpin", SpinWheelSpinSchema);
