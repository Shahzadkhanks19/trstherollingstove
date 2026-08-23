import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const KpiIntelligenceRunSchema = new Schema({
  status: { type: String, enum: ["running", "completed", "failed"], default: "running", index: true },
  lookbackDays: { type: Number, min: 14, max: 365, required: true, index: true },
  requestedBy: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
  startedAt: { type: Date, default: Date.now, required: true },
  completedAt: { type: Date, default: null },
  durationMs: { type: Number, min: 0, default: 0 },
  result: { type: Schema.Types.Mixed, default: null },
  errorMessage: { type: String, trim: true, maxlength: 2000, default: "" },
}, { timestamps: true, versionKey: false });
KpiIntelligenceRunSchema.index({ status: 1, lookbackDays: 1, createdAt: -1 });

export type KpiIntelligenceRunDocument = InferSchemaType<typeof KpiIntelligenceRunSchema>;
export const KpiIntelligenceRun: Model<KpiIntelligenceRunDocument> =
  (models.KpiIntelligenceRun as Model<KpiIntelligenceRunDocument>) ||
  model<KpiIntelligenceRunDocument>("KpiIntelligenceRun", KpiIntelligenceRunSchema);
