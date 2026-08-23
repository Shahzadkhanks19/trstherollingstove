import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const ReportExecutionSchema = new Schema({
  reportId: { type: Schema.Types.ObjectId, ref: "ReportDefinition", default: null, index: true },
  dataset: { type: String, enum: ["orders", "internal_consumption"], required: true, index: true },
  status: { type: String, enum: ["completed", "failed"], required: true, index: true },
  rowCount: { type: Number, min: 0, default: 0 },
  durationMs: { type: Number, min: 0, default: 0 },
  errorMessage: { type: String, trim: true, maxlength: 500, default: "" },
  executedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
}, { timestamps: true, versionKey: false });

ReportExecutionSchema.index({ executedBy: 1, createdAt: -1 });
export type ReportExecutionDocument = InferSchemaType<typeof ReportExecutionSchema>;
export const ReportExecution: Model<ReportExecutionDocument> =
  (models.ReportExecution as Model<ReportExecutionDocument>) || model<ReportExecutionDocument>("ReportExecution", ReportExecutionSchema);
