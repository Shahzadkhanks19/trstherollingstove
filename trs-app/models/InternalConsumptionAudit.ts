import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const InternalConsumptionAuditSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null, index: true },
    action: { type: String, required: true, trim: true, maxlength: 80, index: true },
    saleType: { type: String, default: "", index: true },
    subjectId: { type: Schema.Types.ObjectId, default: null, index: true },
    subjectName: { type: String, trim: true, maxlength: 160, default: "" },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    actorName: { type: String, trim: true, maxlength: 120, default: "" },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reason: { type: String, trim: true, maxlength: 500, default: "" },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, versionKey: false },
);

InternalConsumptionAuditSchema.index({ createdAt: -1, action: 1 });
InternalConsumptionAuditSchema.index({ subjectId: 1, createdAt: -1 });

export type InternalConsumptionAuditDocument = InferSchemaType<typeof InternalConsumptionAuditSchema>;
export const InternalConsumptionAudit: Model<InternalConsumptionAuditDocument> =
  (models.InternalConsumptionAudit as Model<InternalConsumptionAuditDocument>) ||
  model<InternalConsumptionAuditDocument>("InternalConsumptionAudit", InternalConsumptionAuditSchema);
