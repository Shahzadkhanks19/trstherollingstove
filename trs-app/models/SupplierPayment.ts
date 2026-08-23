import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const SupplierPaymentSchema = new Schema(
  {
    paymentNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
      index: true,
    },
    purchaseOrderId: {
      type: Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      default: null,
      index: true,
    },
    amount: {
      type: Number,
      min: 0.01,
      required: true,
    },
    method: {
      type: String,
      enum: [
        "cash",
        "upi",
        "bank_transfer",
        "cheque",
        "card",
        "other",
      ],
      required: true,
    },
    referenceNumber: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },
    paymentDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type SupplierPaymentDocument =
  InferSchemaType<typeof SupplierPaymentSchema>;

export const SupplierPayment:
  Model<SupplierPaymentDocument> =
    (models.SupplierPayment as Model<SupplierPaymentDocument>) ||
    model<SupplierPaymentDocument>(
      "SupplierPayment",
      SupplierPaymentSchema,
    );
