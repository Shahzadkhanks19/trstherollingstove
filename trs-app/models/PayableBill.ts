import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const PayableBillSchema = new Schema(
  {
    billNumber: { type: String, required: true, trim: true, unique: true, index: true },
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", default: null, index: true },
    vendorName: { type: String, required: true, trim: true, maxlength: 180 },
    vendorEmail: { type: String, trim: true, lowercase: true, maxlength: 254, default: "" },
    vendorPhone: { type: String, trim: true, maxlength: 30, default: "" },
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: "PurchaseOrder", default: null, index: true },
    vendorInvoiceNumber: { type: String, trim: true, maxlength: 120, default: "", index: true },
    billDate: { type: Date, required: true, default: Date.now, index: true },
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
    status: { type: String, enum: ["draft", "pending_approval", "approved", "partially_paid", "paid", "overdue", "rejected", "cancelled", "written_off"], default: "draft", index: true },
    paymentTerms: { type: String, trim: true, maxlength: 500, default: "Due on receipt" },
    department: { type: String, trim: true, maxlength: 120, default: "Operations", index: true },
    category: { type: String, trim: true, maxlength: 120, default: "Purchases", index: true },
    referenceNumber: { type: String, trim: true, maxlength: 120, default: "", index: true },
    notes: { type: String, trim: true, maxlength: 2000, default: "" },
    submittedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    rejectedAt: { type: Date, default: null },
    rejectedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    rejectionReason: { type: String, trim: true, maxlength: 500, default: "" },
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
PayableBillSchema.index({ status: 1, dueDate: 1 });
PayableBillSchema.index({ vendorId: 1, billDate: -1 });
PayableBillSchema.index({ department: 1, category: 1, billDate: -1 });
export type PayableBillDocument = InferSchemaType<typeof PayableBillSchema>;
export const PayableBill: Model<PayableBillDocument> =
  (models.PayableBill as Model<PayableBillDocument>) || model<PayableBillDocument>("PayableBill", PayableBillSchema);
