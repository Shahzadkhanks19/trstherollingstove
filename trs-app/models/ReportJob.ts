import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const ReportJobSchema = new Schema({
  scheduleId: { type: Schema.Types.ObjectId, ref: "ScheduledReport", default: null, index: true },
  reportId: { type: Schema.Types.ObjectId, ref: "ReportDefinition", required: true, index: true },
  source: { type: String, enum: ["scheduled", "manual"], required: true, index: true },
  format: { type: String, enum: ["csv", "xlsx", "pdf"], required: true },
  recipients: { type: [String], default: [] },
  deliveryStatus: { type: String, enum: ["pending", "skipped", "sent", "failed"], default: "pending", index: true },
  deliveredAt: { type: Date, default: null },
  deliveryAttempts: { type: Number, min: 0, default: 0 },
  deliveryError: { type: String, trim: true, maxlength: 2000, default: "" },
  status: { type: String, enum: ["queued", "processing", "completed", "failed", "cancelled"], default: "queued", index: true },
  priority: { type: Number, min: 1, max: 10, default: 5, index: true },
  attempt: { type: Number, min: 0, default: 0 },
  maxAttempts: { type: Number, min: 1, max: 10, default: 3 },
  scheduledFor: { type: Date, required: true, index: true },
  nextAttemptAt: { type: Date, default: null, index: true },
  lockedAt: { type: Date, default: null, index: true },
  lockedBy: { type: String, trim: true, maxlength: 200, default: "" },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  failedAt: { type: Date, default: null },
  durationMs: { type: Number, min: 0, default: 0 },
  rowCount: { type: Number, min: 0, default: 0 },
  outputKey: { type: String, trim: true, maxlength: 500, default: "" },
  outputSize: { type: Number, min: 0, default: 0 },
  outputContentType: { type: String, trim: true, maxlength: 120, default: "" },
  outputFilename: { type: String, trim: true, maxlength: 220, default: "" },
  errorMessage: { type: String, trim: true, maxlength: 2000, default: "" },
  errorStack: { type: String, trim: true, maxlength: 8000, default: "" },
  deduplicationKey: { type: String, trim: true, maxlength: 300, default: "" },
  requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
}, { timestamps: true, versionKey: false });

ReportJobSchema.index({ status: 1, priority: -1, nextAttemptAt: 1, scheduledFor: 1, createdAt: 1 });
ReportJobSchema.index({ scheduleId: 1, createdAt: -1 });
ReportJobSchema.index({ requestedBy: 1, createdAt: -1 });
ReportJobSchema.index(
  { deduplicationKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      deduplicationKey: { $ne: "" },
    },
  },
);

export type ReportJobDocument = InferSchemaType<typeof ReportJobSchema>;
export const ReportJob: Model<ReportJobDocument> =
  (models.ReportJob as Model<ReportJobDocument>) || model<ReportJobDocument>("ReportJob", ReportJobSchema);
