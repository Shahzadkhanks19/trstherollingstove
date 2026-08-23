import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const ExecutiveBIReportRunSchema = new Schema({
  status: { type: String, enum: ["running", "completed", "failed"], default: "running", index: true },
  source: { type: String, enum: ["manual", "scheduled", "api"], default: "manual", index: true },
  periodPreset: { type: String, enum: ["today", "week", "month", "quarter", "year", "custom"], required: true },
  periodStart: { type: Date, required: true, index: true },
  periodEnd: { type: Date, required: true, index: true },
  comparisonStart: { type: Date, required: true },
  comparisonEnd: { type: Date, required: true },
  revenue: { type: Number, min: 0, default: 0 },
  grossProfit: { type: Number, default: 0 },
  grossMarginPercent: { type: Number, default: 0 },
  businessHealthScore: { type: Number, min: 0, max: 100, default: 0 },
  durationMs: { type: Number, min: 0, default: 0 },
  requestedBy: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
  errorMessage: { type: String, trim: true, maxlength: 2000, default: "" },
  startedAt: { type: Date, default: Date.now, required: true },
  completedAt: { type: Date, default: null },
}, { timestamps: true, versionKey: false });

ExecutiveBIReportRunSchema.index({ createdAt: -1 });
export type ExecutiveBIReportRunDocument = InferSchemaType<typeof ExecutiveBIReportRunSchema>;
export const ExecutiveBIReportRun: Model<ExecutiveBIReportRunDocument> =
  (models.ExecutiveBIReportRun as Model<ExecutiveBIReportRunDocument> | undefined) ??
  model<ExecutiveBIReportRunDocument>("ExecutiveBIReportRun", ExecutiveBIReportRunSchema);
