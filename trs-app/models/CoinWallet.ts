import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const CoinWalletSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    balance: { type: Number, min: 0, default: 0 },
    lifetimeEarned: { type: Number, min: 0, default: 0 },
    lifetimeRedeemed: { type: Number, min: 0, default: 0 },
    lastActivityAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

export type CoinWalletDocument = InferSchemaType<typeof CoinWalletSchema>;
export const CoinWallet: Model<CoinWalletDocument> =
  (models.CoinWallet as Model<CoinWalletDocument>) ||
  model<CoinWalletDocument>("CoinWallet", CoinWalletSchema);
