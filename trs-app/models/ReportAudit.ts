import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const ReportAuditSchema = new Schema({
  reportId: { type: Schema.Types.ObjectId, ref: "ReportDefinition", default: null, index: true },
  action: { type: String, enum: ["created", "updated", "duplicated", "archived", "restored", "favorited", "unfavorited", "pinned", "unpinned", "exported", "version_restored"], required: true, index: true },
  actorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  format: { type: String, enum: ["", "csv", "xlsx", "pdf"], default: "" },
  metadata: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true, versionKey: false });

ReportAuditSchema.index({ reportId: 1, createdAt: -1 });
ReportAuditSchema.index({ actorId: 1, createdAt: -1 });

export type ReportAuditDocument = InferSchemaType<typeof ReportAuditSchema>;
export const ReportAudit: Model<ReportAuditDocument> =
  (models.ReportAudit as Model<ReportAuditDocument>) || model<ReportAuditDocument>("ReportAudit", ReportAuditSchema);
