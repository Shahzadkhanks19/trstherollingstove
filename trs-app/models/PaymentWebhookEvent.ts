import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const PaymentWebhookEventSchema = new Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    eventName: { type: String, required: true, trim: true, index: true },
    provider: {
      type: String,
      enum: ["razorpay"],
      default: "razorpay",
      required: true,
    },
    processed: { type: Boolean, default: false, index: true },
    processedAt: { type: Date, default: null },
    processingError: { type: String, trim: true, default: "" },
    payload: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true, versionKey: false },
);

export type PaymentWebhookEventDocument = InferSchemaType<
  typeof PaymentWebhookEventSchema
>;
export const PaymentWebhookEvent: Model<PaymentWebhookEventDocument> =
  (models.PaymentWebhookEvent as Model<PaymentWebhookEventDocument>) ||
  model<PaymentWebhookEventDocument>(
    "PaymentWebhookEvent",
    PaymentWebhookEventSchema,
  );
