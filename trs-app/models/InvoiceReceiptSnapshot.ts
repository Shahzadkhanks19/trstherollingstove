import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
const BreakdownSchema = new Schema({ key: { type: String, required: true }, count: { type: Number, required: true }, amount: { type: Number, required: true } }, { _id: false });
const InvoiceReceiptSnapshotSchema = new Schema(
  {
    periodKey: { type: String, required: true, unique: true, index: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    currency: { type: String, required: true, default: "INR" },
    metrics: {
      documentCount: { type: Number, required: true },
      issuedCount: { type: Number, required: true },
      paidCount: { type: Number, required: true },
      overdueCount: { type: Number, required: true },
      invoicedAmount: { type: Number, required: true },
      receivedAmount: { type: Number, required: true },
      balanceAmount: { type: Number, required: true },
      taxAmount: { type: Number, required: true },
      receiptCount: { type: Number, required: true },
      receiptAmount: { type: Number, required: true },
      collectionRate: { type: Number, required: true },
    },
    byStatus: { type: [BreakdownSchema], default: [] },
    byDocumentType: { type: [BreakdownSchema], default: [] },
    byPaymentMethod: { type: [BreakdownSchema], default: [] },
    generatedAt: { type: Date, required: true, default: Date.now },
    generatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    source: { type: String, enum: ["manual", "scheduled", "system"], default: "system" },
  },
  { timestamps: true, versionKey: false },
);
export type InvoiceReceiptSnapshotRecord = InferSchemaType<typeof InvoiceReceiptSnapshotSchema>;
export const InvoiceReceiptSnapshot: Model<InvoiceReceiptSnapshotRecord> =
  (models.InvoiceReceiptSnapshot as Model<InvoiceReceiptSnapshotRecord>) || model<InvoiceReceiptSnapshotRecord>("InvoiceReceiptSnapshot", InvoiceReceiptSnapshotSchema);
