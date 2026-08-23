import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const ScheduleConfigSchema = new Schema({
  frequency: { type: String, enum: ["one_time", "daily", "weekly", "monthly", "quarterly", "yearly"], required: true },
  timezone: { type: String, required: true, trim: true, maxlength: 80, default: "Asia/Kolkata" },
  hour: { type: Number, min: 0, max: 23, required: true, default: 9 },
  minute: { type: Number, min: 0, max: 59, required: true, default: 0 },
  dayOfWeek: { type: Number, min: 0, max: 6, default: 1 },
  dayOfMonth: { type: Number, min: 1, max: 28, default: 1 },
  monthOfYear: { type: Number, min: 1, max: 12, default: 1 },
  runAt: { type: Date, default: null },
}, { _id: false });

const ScheduledReportSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 140, index: true },
  description: { type: String, trim: true, maxlength: 500, default: "" },
  reportId: { type: Schema.Types.ObjectId, ref: "ReportDefinition", required: true, index: true },
  format: { type: String, enum: ["csv", "xlsx", "pdf"], default: "pdf", index: true },
  recipients: { type: [String], default: [] },
  schedule: { type: ScheduleConfigSchema, required: true },
  status: { type: String, enum: ["active", "paused", "completed", "archived"], default: "active", index: true },
  nextRunAt: { type: Date, default: null, index: true },
  lastRunAt: { type: Date, default: null },
  lastJobId: { type: Schema.Types.ObjectId, ref: "ReportJob", default: null },
  runCount: { type: Number, min: 0, default: 0 },
  failureCount: { type: Number, min: 0, default: 0 },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  deletedAt: { type: Date, default: null, index: true },
}, { timestamps: true, versionKey: false });

ScheduledReportSchema.index({ status: 1, nextRunAt: 1, deletedAt: 1 });
ScheduledReportSchema.index({ createdBy: 1, deletedAt: 1, updatedAt: -1 });
ScheduledReportSchema.index({ reportId: 1, status: 1 });

export type ScheduledReportDocument = InferSchemaType<typeof ScheduledReportSchema>;
export const ScheduledReport: Model<ScheduledReportDocument> =
  (models.ScheduledReport as Model<ScheduledReportDocument>) ||
  model<ScheduledReportDocument>("ScheduledReport", ScheduledReportSchema);
