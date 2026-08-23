import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const ReportVersionSchema = new Schema({
  reportId: { type: Schema.Types.ObjectId, ref: "ReportDefinition", required: true, index: true },
  version: { type: Number, required: true, min: 1 },
  snapshot: { type: Schema.Types.Mixed, required: true },
  changeSummary: { type: String, trim: true, maxlength: 300, default: "Report updated" },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
}, { timestamps: true, versionKey: false });

ReportVersionSchema.index({ reportId: 1, version: -1 }, { unique: true });

export type ReportVersionDocument = InferSchemaType<typeof ReportVersionSchema>;
export const ReportVersion: Model<ReportVersionDocument> =
  (models.ReportVersion as Model<ReportVersionDocument>) || model<ReportVersionDocument>("ReportVersion", ReportVersionSchema);
