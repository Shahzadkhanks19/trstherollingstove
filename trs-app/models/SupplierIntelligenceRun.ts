import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const SupplierIntelligenceRunSchema = new Schema({
  status: { type: String, enum: ["running", "completed", "failed"], default: "running", index: true },
  source: { type: String, enum: ["manual", "scheduled", "api"], default: "manual", index: true },
  lookbackDays: { type: Number, min: 30, max: 1095, required: true },
  supplierCount: { type: Number, min: 0, default: 0 },
  preferredSupplierCount: { type: Number, min: 0, default: 0 },
  totalSpend: { type: Number, min: 0, default: 0 },
  averageScore: { type: Number, min: 0, max: 100, default: 0 },
  durationMs: { type: Number, min: 0, default: 0 },
  errorMessage: { type: String, trim: true, maxlength: 2000, default: "" },
  requestedBy: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
  startedAt: { type: Date, required: true, default: Date.now },
  completedAt: { type: Date, default: null },
}, { timestamps: true, versionKey: false });

SupplierIntelligenceRunSchema.index({ createdAt: -1 });
export type SupplierIntelligenceRunDocument = InferSchemaType<typeof SupplierIntelligenceRunSchema>;
export const SupplierIntelligenceRun: Model<SupplierIntelligenceRunDocument> =
  (models.SupplierIntelligenceRun as Model<SupplierIntelligenceRunDocument> | undefined) ??
  model<SupplierIntelligenceRunDocument>("SupplierIntelligenceRun", SupplierIntelligenceRunSchema);
