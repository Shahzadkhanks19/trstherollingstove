import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const ForecastAuditSchema = new Schema({
  runId: { type: Schema.Types.ObjectId, ref: "BusinessForecastRun", required: true, index: true },
  action: { type: String, enum: ["approved", "published", "unpublished", "archived", "restored", "accuracy_recalculated", "notes_updated"], required: true, index: true },
  actorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  notes: { type: String, trim: true, maxlength: 1000, default: "" },
  metadata: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true, versionKey: false });
ForecastAuditSchema.index({ createdAt: -1 });

export type ForecastAuditDocument = InferSchemaType<typeof ForecastAuditSchema>;
export const ForecastAudit: Model<ForecastAuditDocument> =
  (models.ForecastAudit as Model<ForecastAuditDocument>) || model<ForecastAuditDocument>("ForecastAudit", ForecastAuditSchema);
