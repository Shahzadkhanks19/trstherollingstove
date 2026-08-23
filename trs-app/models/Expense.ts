import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const ExpenseSchema = new Schema(
  {
    expenseNumber: { type: String, required: true, trim: true, unique: true, index: true },
    expenseDate: { type: Date, required: true, default: Date.now, index: true },
    category: {
      type: String,
      enum: ["operating", "payroll", "utility", "vendor", "marketing", "maintenance", "rent", "insurance", "tax", "miscellaneous"],
      required: true,
      index: true,
    },
    department: {
      type: String,
      enum: ["restaurant", "kitchen", "administration", "marketing", "technology", "human_resources", "finance", "general"],
      required: true,
      default: "general",
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    description: { type: String, trim: true, maxlength: 2000, default: "" },
    vendorId: { type: Schema.Types.ObjectId, ref: "Supplier", default: null, index: true },
    vendorName: { type: String, trim: true, maxlength: 180, default: "" },
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: "PurchaseOrder", default: null, index: true },
    referenceNumber: { type: String, trim: true, maxlength: 120, default: "", index: true },
    subtotal: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, required: true, min: 0, default: 0 },
    discountAmount: { type: Number, required: true, min: 0, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, required: true, min: 0, default: 0 },
    outstandingAmount: { type: Number, required: true, min: 0, default: 0 },
    paymentMethod: { type: String, enum: ["cash", "card", "upi", "bank_transfer", "wallet", "cheque", "credit", "other"], default: "cash", index: true },
    paymentStatus: { type: String, enum: ["unpaid", "partially_paid", "paid", "refunded", "void"], default: "unpaid", index: true },
    approvalStatus: { type: String, enum: ["draft", "pending", "approved", "rejected", "void"], default: "draft", index: true },
    recurring: {
      enabled: { type: Boolean, default: false },
      frequency: { type: String, enum: ["weekly", "monthly", "quarterly", "yearly", null], default: null },
      nextDueDate: { type: Date, default: null, index: true },
      endDate: { type: Date, default: null },
    },
    invoiceUrl: { type: String, trim: true, maxlength: 1000, default: "" },
    tags: { type: [String], default: [] },
    notes: { type: String, trim: true, maxlength: 2000, default: "" },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    rejectedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, maxlength: 500, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, versionKey: false },
);

ExpenseSchema.index({ expenseDate: -1, category: 1 });
ExpenseSchema.index({ approvalStatus: 1, paymentStatus: 1, expenseDate: -1 });
ExpenseSchema.index({ department: 1, expenseDate: -1 });

export type ExpenseDocument = InferSchemaType<typeof ExpenseSchema>;
export const Expense: Model<ExpenseDocument> =
  (models.Expense as Model<ExpenseDocument>) || model<ExpenseDocument>("Expense", ExpenseSchema);
