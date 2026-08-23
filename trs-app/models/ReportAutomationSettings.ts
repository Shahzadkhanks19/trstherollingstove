import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const ReportAutomationSettingsSchema = new Schema({
  key: { type: String, required: true, unique: true, default: "global" },
  workerConcurrency: { type: Number, min: 1, max: 25, default: 5 },
  maxRowsPerReport: { type: Number, min: 100, max: 100000, default: 5000 },
  artifactRetentionDays: { type: Number, min: 1, max: 3650, default: 30 },
  failedJobRetentionDays: { type: Number, min: 1, max: 3650, default: 90 },
  notificationOnSuccess: { type: Boolean, default: true },
  notificationOnFailure: { type: Boolean, default: true },
  emailDeliveryEnabled: { type: Boolean, default: true },
  queueWarningThreshold: { type: Number, min: 1, max: 100000, default: 100 },
  staleWorkerMinutes: { type: Number, min: 5, max: 1440, default: 15 },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true, versionKey: false });

export type ReportAutomationSettingsDocument = InferSchemaType<typeof ReportAutomationSettingsSchema>;
export const ReportAutomationSettings: Model<ReportAutomationSettingsDocument> =
  (models.ReportAutomationSettings as Model<ReportAutomationSettingsDocument>) ||
  model<ReportAutomationSettingsDocument>("ReportAutomationSettings", ReportAutomationSettingsSchema);
