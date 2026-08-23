import { Schema, model, models, type InferSchemaType } from "mongoose";

const commentSchema = new Schema({ actorId: { type: Schema.Types.ObjectId, ref: "User", default: null }, actorName: { type: String, required: true }, message: { type: String, required: true, trim: true }, createdAt: { type: Date, default: Date.now } }, { _id: false });
const historySchema = new Schema({ action: { type: String, required: true }, actorId: { type: Schema.Types.ObjectId, ref: "User", default: null }, actorName: { type: String, required: true }, note: { type: String, default: null }, occurredAt: { type: Date, default: Date.now } }, { _id: false });
const financeApprovalRequestSchema = new Schema({
  requestNumber: { type: String, required: true, unique: true, index: true },
  module: { type: String, required: true, trim: true, index: true },
  entityType: { type: String, required: true, trim: true },
  entityId: { type: String, required: true, trim: true, index: true },
  action: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "", trim: true },
  amount: { type: Number, default: 0, min: 0 },
  currency: { type: String, default: "INR" },
  status: { type: String, enum: ["pending", "approved", "rejected", "cancelled", "expired"], default: "pending", index: true },
  priority: { type: String, enum: ["low", "normal", "high", "critical"], default: "normal", index: true },
  requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  requestedByName: { type: String, required: true },
  assignedRole: { type: String, default: "admin" },
  decidedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  decidedByName: { type: String, default: null },
  decisionNote: { type: String, default: null },
  decidedAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null, index: true },
  payload: { type: Schema.Types.Mixed, default: {} },
  comments: { type: [commentSchema], default: [] },
  history: { type: [historySchema], default: [] },
}, { timestamps: true, versionKey: false });
financeApprovalRequestSchema.index({ status: 1, priority: 1, createdAt: -1 });
export type FinanceApprovalRequestDocument = InferSchemaType<typeof financeApprovalRequestSchema>;
export const FinanceApprovalRequest = models.FinanceApprovalRequest ?? model("FinanceApprovalRequest", financeApprovalRequestSchema);
