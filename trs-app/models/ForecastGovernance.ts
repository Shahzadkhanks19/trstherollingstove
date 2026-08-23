import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const ForecastGovernanceSchema = new Schema({
  runId: { type: Schema.Types.ObjectId, ref: "BusinessForecastRun", required: true, unique: true, index: true },
  versionNumber: { type: Number, min: 1, default: 1 },
  modelVersion: { type: String, trim: true, maxlength: 80, default: "statistical-v1" },
  status: { type: String, enum: ["draft", "approved", "published", "archived"], default: "draft", index: true },
  notes: { type: String, trim: true, maxlength: 1000, default: "" },
  approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  approvedAt: { type: Date, default: null },
  publishedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  publishedAt: { type: Date, default: null },
  archivedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  archivedAt: { type: Date, default: null },
}, { timestamps: true, versionKey: false });
ForecastGovernanceSchema.index({ status: 1, updatedAt: -1 });

export type ForecastGovernanceDocument = InferSchemaType<typeof ForecastGovernanceSchema>;
export const ForecastGovernance: Model<ForecastGovernanceDocument> =
  (models.ForecastGovernance as Model<ForecastGovernanceDocument>) || model<ForecastGovernanceDocument>("ForecastGovernance", ForecastGovernanceSchema);
