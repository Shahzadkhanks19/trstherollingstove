import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
const POSAuditEventSchema = new Schema({
  action: { type: String, required: true, trim: true, maxlength: 80, index: true },
  entityType: { type: String, required: true, trim: true, maxlength: 40 },
  entityId: { type: Schema.Types.ObjectId, default: null, index: true },
  actorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  reason: { type: String, trim: true, maxlength: 500, default: "" },
  before: { type: Schema.Types.Mixed, default: null },
  after: { type: Schema.Types.Mixed, default: null },
  metadata: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true, versionKey: false });
export type POSAuditEventDocument = InferSchemaType<typeof POSAuditEventSchema>;
export const POSAuditEvent: Model<POSAuditEventDocument> =
  (models.POSAuditEvent as Model<POSAuditEventDocument>) || model<POSAuditEventDocument>("POSAuditEvent", POSAuditEventSchema);
