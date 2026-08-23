import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const InternalConsumptionSettingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "default" },
    enableMealLimits: { type: Boolean, default: true },
    enableManagerApproval: { type: Boolean, default: true },
    enableAuditLogging: { type: Boolean, default: true },
    enableEmailNotifications: { type: Boolean, default: false },
    enableSmsNotifications: { type: Boolean, default: false },
    allowOwnerOverride: { type: Boolean, default: true },
    defaultDailyLimit: { type: Number, min: 0, max: 100, default: 2 },
    defaultMonthlyLimit: { type: Number, min: 0, max: 3000, default: 60 },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, versionKey: false },
);

export type InternalConsumptionSettingsDocument = InferSchemaType<typeof InternalConsumptionSettingsSchema>;
export const InternalConsumptionSettings: Model<InternalConsumptionSettingsDocument> =
  (models.InternalConsumptionSettings as Model<InternalConsumptionSettingsDocument>) ||
  model<InternalConsumptionSettingsDocument>("InternalConsumptionSettings", InternalConsumptionSettingsSchema);
