import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const BreakdownSchema = new Schema(
  {
    key: { type: String, required: true },
    count: { type: Number, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false },
);

const PaymentManagementSnapshotSchema = new Schema(
  {
    periodKey: { type: String, required: true, unique: true, index: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    currency: { type: String, required: true, default: "INR" },
    metrics: {
      paymentCount: { type: Number, required: true },
      capturedCount: { type: Number, required: true },
      failedCount: { type: Number, required: true },
      pendingCount: { type: Number, required: true },
      refundedCount: { type: Number, required: true },
      grossAmount: { type: Number, required: true },
      capturedAmount: { type: Number, required: true },
      refundedAmount: { type: Number, required: true },
      netCollectedAmount: { type: Number, required: true },
      successRate: { type: Number, required: true },
      failureRate: { type: Number, required: true },
      reconciliationCount: { type: Number, required: true },
      matchedReconciliationCount: { type: Number, required: true },
      unmatchedAmount: { type: Number, required: true },
    },
    byStatus: { type: [BreakdownSchema], default: [] },
    byMethod: { type: [BreakdownSchema], default: [] },
    byProvider: { type: [BreakdownSchema], default: [] },
    byDay: { type: [BreakdownSchema], default: [] },
    generatedAt: { type: Date, required: true, default: Date.now },
    generatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    source: { type: String, enum: ["manual", "scheduled", "system"], default: "system" },
  },
  { timestamps: true, versionKey: false },
);

export type PaymentManagementSnapshotRecord = InferSchemaType<typeof PaymentManagementSnapshotSchema>;
export const PaymentManagementSnapshot: Model<PaymentManagementSnapshotRecord> =
  (models.PaymentManagementSnapshot as Model<PaymentManagementSnapshotRecord>) ||
  model<PaymentManagementSnapshotRecord>("PaymentManagementSnapshot", PaymentManagementSnapshotSchema);
