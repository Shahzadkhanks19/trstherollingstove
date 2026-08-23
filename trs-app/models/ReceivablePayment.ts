import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
const ReceivablePaymentSchema = new Schema({
  paymentNumber: { type: String, required: true, trim: true, unique: true, index: true },
  invoiceId: { type: Schema.Types.ObjectId, ref: "ReceivableInvoice", required: true, index: true },
  customerId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
  paymentDate: { type: Date, required: true, default: Date.now, index: true },
  amount: { type: Number, required: true, min: 0.01 },
  paymentMethod: { type: String, enum: ["cash", "card", "upi", "bank_transfer", "wallet", "cheque", "other"], required: true, index: true },
  transactionReference: { type: String, trim: true, maxlength: 180, default: "", index: true },
  status: { type: String, enum: ["recorded", "reversed"], default: "recorded", index: true },
  notes: { type: String, trim: true, maxlength: 1000, default: "" },
  reversedAt: { type: Date, default: null },
  reversalReason: { type: String, trim: true, maxlength: 500, default: "" },
  recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true, versionKey: false });
ReceivablePaymentSchema.index({ invoiceId: 1, paymentDate: -1 });
export type ReceivablePaymentDocument = InferSchemaType<typeof ReceivablePaymentSchema>;
export const ReceivablePayment: Model<ReceivablePaymentDocument> = (models.ReceivablePayment as Model<ReceivablePaymentDocument>) || model<ReceivablePaymentDocument>("ReceivablePayment", ReceivablePaymentSchema);
