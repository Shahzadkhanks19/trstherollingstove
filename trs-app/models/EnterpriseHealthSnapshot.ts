import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const EnterpriseHealthSnapshotSchema = new Schema({
  status: { type: String, enum: ["healthy", "degraded", "critical"], required: true, index: true },
  score: { type: Number, min: 0, max: 100, required: true },
  checks: { type: [Schema.Types.Mixed], default: [] },
  metrics: { type: Schema.Types.Mixed, default: {} },
  recommendations: { type: [String], default: [] },
  source: { type: String, enum: ["manual", "scheduled", "api"], default: "manual", index: true },
  durationMs: { type: Number, min: 0, default: 0 },
  generatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  generatedAt: { type: Date, default: Date.now, required: true, index: true },
}, { timestamps: true, versionKey: false });

EnterpriseHealthSnapshotSchema.index({ generatedAt: -1 });
EnterpriseHealthSnapshotSchema.index({ status: 1, generatedAt: -1 });

export type EnterpriseHealthSnapshotDocument = InferSchemaType<typeof EnterpriseHealthSnapshotSchema>;
export const EnterpriseHealthSnapshot: Model<EnterpriseHealthSnapshotDocument> =
  (models.EnterpriseHealthSnapshot as Model<EnterpriseHealthSnapshotDocument> | undefined) ??
  model<EnterpriseHealthSnapshotDocument>("EnterpriseHealthSnapshot", EnterpriseHealthSnapshotSchema);
