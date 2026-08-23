import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const ReceivableInvoiceSchema = new Schema(
  {
    invoiceNumber: { type: String, required: true, trim: true, unique: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    customerName: { type: String, required: true, trim: true, maxlength: 180 },
    customerEmail: { type: String, trim: true, lowercase: true, maxlength: 254, default: "" },
    customerPhone: { type: String, trim: true, maxlength: 30, default: "" },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null, index: true },
    invoiceDate: { type: Date, required: true, default: Date.now, index: true },
    dueDate: { type: Date, required: true, index: true },
    currency: { type: String, required: true, default: "INR", trim: true, uppercase: true },
    subtotal: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, required: true, min: 0, default: 0 },
    discountAmount: { type: Number, required: true, min: 0, default: 0 },
    creditAmount: { type: Number, required: true, min: 0, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, required: true, min: 0, default: 0 },
    writtenOffAmount: { type: Number, required: true, min: 0, default: 0 },
    outstandingAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["draft", "issued", "partially_paid", "paid", "overdue", "cancelled", "written_off"], default: "draft", index: true },
    paymentTerms: { type: String, trim: true, maxlength: 500, default: "Due on receipt" },
    referenceNumber: { type: String, trim: true, maxlength: 120, default: "", index: true },
    notes: { type: String, trim: true, maxlength: 2000, default: "" },
    issuedAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancellationReason: { type: String, trim: true, maxlength: 500, default: "" },
    writtenOffAt: { type: Date, default: null },
    writeOffReason: { type: String, trim: true, maxlength: 500, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, versionKey: false },
);
ReceivableInvoiceSchema.index({ status: 1, dueDate: 1 });
ReceivableInvoiceSchema.index({ customerId: 1, invoiceDate: -1 });
ReceivableInvoiceSchema.index({ orderId: 1, invoiceDate: -1 });
export type ReceivableInvoiceDocument = InferSchemaType<typeof ReceivableInvoiceSchema>;
export const ReceivableInvoice: Model<ReceivableInvoiceDocument> =
  (models.ReceivableInvoice as Model<ReceivableInvoiceDocument>) || model<ReceivableInvoiceDocument>("ReceivableInvoice", ReceivableInvoiceSchema);
