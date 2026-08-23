import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
const FinanceReceiptSchema = new Schema(
  {
    receiptNumber: { type: String, required: true, unique: true, index: true, trim: true },
    documentId: { type: Schema.Types.ObjectId, ref: "FinanceDocument", required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    partyName: { type: String, required: true, trim: true, maxlength: 180 },
    receiptDate: { type: Date, required: true, default: Date.now, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, required: true, trim: true, uppercase: true, default: "INR" },
    paymentMethod: { type: String, enum: ["cash", "card", "upi", "bank_transfer", "wallet", "cheque", "other"], required: true, index: true },
    transactionReference: { type: String, trim: true, maxlength: 180, default: "", index: true },
    notes: { type: String, trim: true, maxlength: 1000, default: "" },
    status: { type: String, enum: ["active", "void"], default: "active", index: true },
    voidedAt: { type: Date, default: null },
    voidedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    voidReason: { type: String, trim: true, maxlength: 500, default: "" },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, versionKey: false },
);
FinanceReceiptSchema.index({ documentId: 1, receiptDate: -1 });
export type FinanceReceiptRecord = InferSchemaType<typeof FinanceReceiptSchema>;
export const FinanceReceipt: Model<FinanceReceiptRecord> =
  (models.FinanceReceipt as Model<FinanceReceiptRecord>) || model<FinanceReceiptRecord>("FinanceReceipt", FinanceReceiptSchema);
