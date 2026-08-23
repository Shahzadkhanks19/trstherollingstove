import { Schema, model, models, type InferSchemaType } from "mongoose";

const financeAuditEventSchema = new Schema({
  module: { type: String, required: true, trim: true, index: true },
  entityType: { type: String, required: true, trim: true, index: true },
  entityId: { type: String, required: true, trim: true, index: true },
  action: { type: String, required: true, trim: true, index: true },
  actorId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
  actorName: { type: String, default: "System", trim: true },
  actorRole: { type: String, default: "system", trim: true },
  before: { type: Schema.Types.Mixed, default: null },
  after: { type: Schema.Types.Mixed, default: null },
  metadata: { type: Schema.Types.Mixed, default: {} },
  ipAddress: { type: String, default: null },
  userAgent: { type: String, default: null },
  occurredAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true, versionKey: false });
financeAuditEventSchema.index({ module: 1, occurredAt: -1 });
export type FinanceAuditEventDocument = InferSchemaType<typeof financeAuditEventSchema>;
export const FinanceAuditEvent = models.FinanceAuditEvent ?? model("FinanceAuditEvent", financeAuditEventSchema);
