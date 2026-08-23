import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const PaymentSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ["razorpay"],
      default: "razorpay",
      required: true,
    },
    providerOrderId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    providerPaymentId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    providerRefundId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    providerRefundIds: {
      type: [String],
      default: [],
    },
    amount: { type: Number, required: true, min: 0 },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      default: "INR",
    },
    status: {
      type: String,
      required: true,
      enum: [
        "created",
        "authorized",
        "captured",
        "failed",
        "refund_pending",
        "refunded",
        "partially_refunded",
      ],
      default: "created",
      index: true,
    },
    amountRefunded: { type: Number, min: 0, default: 0 },
    method: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    contact: { type: String, trim: true, default: "" },
    failureCode: { type: String, trim: true, default: "" },
    failureDescription: { type: String, trim: true, default: "" },
    verifiedAt: { type: Date, default: null },
    capturedAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },
    rawMetadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, versionKey: false },
);

PaymentSchema.index({ customerId: 1, createdAt: -1 });
PaymentSchema.index({ orderId: 1, createdAt: -1 });

export type PaymentDocument = InferSchemaType<typeof PaymentSchema>;
export const Payment: Model<PaymentDocument> =
  (models.Payment as Model<PaymentDocument>) ||
  model<PaymentDocument>("Payment", PaymentSchema);
