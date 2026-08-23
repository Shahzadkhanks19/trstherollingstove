import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const PaymentReconciliationSchema = new Schema(
  {
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment", required: true, index: true },
    providerPaymentId: { type: String, trim: true, default: "", index: true },
    reconciliationType: {
      type: String,
      enum: ["gateway", "bank", "manual"],
      required: true,
      default: "manual",
    },
    status: {
      type: String,
      enum: ["matched", "unmatched", "difference", "ignored"],
      required: true,
      default: "matched",
      index: true,
    },
    expectedAmount: { type: Number, required: true, min: 0 },
    settledAmount: { type: Number, required: true, min: 0 },
    differenceAmount: { type: Number, required: true, default: 0 },
    settlementReference: { type: String, trim: true, default: "", index: true },
    settledAt: { type: Date, default: null },
    notes: { type: String, trim: true, default: "", maxlength: 1000 },
    reconciledBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reconciledAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true, versionKey: false },
);

PaymentReconciliationSchema.index({ paymentId: 1, reconciliationType: 1, createdAt: -1 });
PaymentReconciliationSchema.index({ status: 1, reconciledAt: -1 });

export type PaymentReconciliationRecord = InferSchemaType<typeof PaymentReconciliationSchema>;
export const PaymentReconciliation: Model<PaymentReconciliationRecord> =
  (models.PaymentReconciliation as Model<PaymentReconciliationRecord>) ||
  model<PaymentReconciliationRecord>("PaymentReconciliation", PaymentReconciliationSchema);
