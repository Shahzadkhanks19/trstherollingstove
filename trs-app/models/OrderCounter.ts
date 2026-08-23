import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const OrderCounterSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    sequence: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true, versionKey: false },
);

export type OrderCounterDocument = InferSchemaType<typeof OrderCounterSchema>;
export const OrderCounter: Model<OrderCounterDocument> =
  (models.OrderCounter as Model<OrderCounterDocument>) ||
  model<OrderCounterDocument>("OrderCounter", OrderCounterSchema);
