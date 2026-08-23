import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const InternalConsumptionPolicySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    scopeType: { type: String, enum: ["global", "staff", "department", "designation"], required: true, index: true },
    scopeId: { type: Schema.Types.ObjectId, default: null, index: true },
    dailyLimit: { type: Number, min: 0, max: 100, default: 2 },
    weeklyLimit: { type: Number, min: 0, max: 700, default: 14 },
    monthlyLimit: { type: Number, min: 0, max: 3000, default: 60 },
    yearlyLimit: { type: Number, min: 0, max: 36500, default: 720 },
    unlimited: { type: Boolean, default: false },
    requireManagerApproval: { type: Boolean, default: true },
    requireOwnerApprovalAboveValue: { type: Number, min: 0, default: 0 },
    allowedMealCategoryIds: [{ type: Schema.Types.ObjectId, ref: "InternalConsumptionMaster" }],
    allowedFrom: { type: String, trim: true, default: "" },
    allowedUntil: { type: String, trim: true, default: "" },
    priority: { type: Number, min: 0, max: 9999, default: 100 },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, versionKey: false },
);
InternalConsumptionPolicySchema.index({ scopeType: 1, scopeId: 1, isActive: 1, priority: 1 });

export type InternalConsumptionPolicyDocument = InferSchemaType<typeof InternalConsumptionPolicySchema>;
export const InternalConsumptionPolicy: Model<InternalConsumptionPolicyDocument> =
  (models.InternalConsumptionPolicy as Model<InternalConsumptionPolicyDocument>) ||
  model<InternalConsumptionPolicyDocument>("InternalConsumptionPolicy", InternalConsumptionPolicySchema);
