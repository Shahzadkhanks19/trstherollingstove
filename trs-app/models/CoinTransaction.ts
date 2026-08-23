import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const CoinTransactionSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    walletId: {
      type: Schema.Types.ObjectId,
      ref: "CoinWallet",
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["earn", "redeem", "expire", "adjustment", "refund"],
      index: true,
    },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true, min: 0 },
    description: { type: String, required: true, trim: true, maxlength: 300 },
    expiresAt: { type: Date, default: null, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true, versionKey: false },
);

CoinTransactionSchema.index({ customerId: 1, createdAt: -1 });

export type CoinTransactionDocument = InferSchemaType<
  typeof CoinTransactionSchema
>;
export const CoinTransaction: Model<CoinTransactionDocument> =
  (models.CoinTransaction as Model<CoinTransactionDocument>) ||
  model<CoinTransactionDocument>("CoinTransaction", CoinTransactionSchema);
