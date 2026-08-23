import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const FinanceLineItemSchema = new Schema(
  {
    description: { type: String, required: true, trim: true, maxlength: 300 },
    quantity: { type: Number, required: true, min: 0.001 },
    unitPrice: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, required: true, min: 0, max: 100, default: 0 },
    discountAmount: { type: Number, required: true, min: 0, default: 0 },
    taxableAmount: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const FinanceDocumentSchema = new Schema(
  {
    documentNumber: { type: String, required: true, unique: true, index: true, trim: true },
    documentType: { type: String, enum: ["sales_invoice", "credit_note", "debit_note"], required: true, index: true },
    sourceType: { type: String, enum: ["order", "receivable", "payable", "manual"], default: "manual", index: true },
    sourceId: { type: Schema.Types.ObjectId, default: null, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    partyName: { type: String, required: true, trim: true, maxlength: 180 },
    partyEmail: { type: String, trim: true, lowercase: true, maxlength: 254, default: "" },
    partyPhone: { type: String, trim: true, maxlength: 30, default: "" },
    billingAddress: { type: String, trim: true, maxlength: 1000, default: "" },
    gstin: { type: String, trim: true, uppercase: true, maxlength: 20, default: "" },
    currency: { type: String, required: true, trim: true, uppercase: true, default: "INR" },
    issueDate: { type: Date, required: true, default: Date.now, index: true },
    dueDate: { type: Date, required: true, index: true },
    lineItems: { type: [FinanceLineItemSchema], required: true, validate: [(v: unknown[]) => v.length > 0, "At least one line item is required."] },
    subtotal: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, required: true, min: 0, default: 0 },
    taxableAmount: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, required: true, min: 0, default: 0 },
    roundingAmount: { type: Number, required: true, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    receivedAmount: { type: Number, required: true, min: 0, default: 0 },
    balanceAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["draft", "issued", "partially_paid", "paid", "overdue", "cancelled"], default: "draft", index: true },
    notes: { type: String, trim: true, maxlength: 2000, default: "" },
    terms: { type: String, trim: true, maxlength: 2000, default: "Payment due as stated on this document." },
    issuedAt: { type: Date, default: null },
    issuedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    cancellationReason: { type: String, trim: true, maxlength: 500, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, versionKey: false },
);
FinanceDocumentSchema.index({ partyName: 1, issueDate: -1 });
FinanceDocumentSchema.index({ status: 1, dueDate: 1 });
FinanceDocumentSchema.index({ sourceType: 1, sourceId: 1, documentType: 1 }, { unique: true, partialFilterExpression: { sourceId: { $type: "objectId" }, documentType: "sales_invoice" } });
export type FinanceDocumentRecord = InferSchemaType<typeof FinanceDocumentSchema>;
export const FinanceDocument: Model<FinanceDocumentRecord> =
  (models.FinanceDocument as Model<FinanceDocumentRecord>) || model<FinanceDocumentRecord>("FinanceDocument", FinanceDocumentSchema);
