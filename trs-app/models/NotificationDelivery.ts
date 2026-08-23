import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const NotificationDeliverySchema = new Schema(
  {
    notificationId: {
      type: Schema.Types.ObjectId,
      ref: "Notification",
      default: null,
      index: true,
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ["in_app", "email", "whatsapp"],
      required: true,
      index: true,
    },
    eventKey: { type: String, required: true, trim: true, maxlength: 100 },
    destination: { type: String, trim: true, maxlength: 254, default: "" },
    provider: { type: String, trim: true, maxlength: 80, default: "" },
    providerMessageId: { type: String, trim: true, maxlength: 200, default: "" },
    status: {
      type: String,
      enum: ["queued", "sent", "delivered", "failed", "skipped"],
      default: "queued",
      index: true,
    },
    attempts: { type: Number, min: 0, default: 0 },
    lastAttemptAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    failureReason: { type: String, trim: true, maxlength: 1000, default: "" },
    payload: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, versionKey: false },
);

NotificationDeliverySchema.index({ recipientId: 1, createdAt: -1 });
NotificationDeliverySchema.index({ status: 1, createdAt: 1 });

export type NotificationDeliveryDocument = InferSchemaType<
  typeof NotificationDeliverySchema
>;

export const NotificationDelivery: Model<NotificationDeliveryDocument> =
  (models.NotificationDelivery as Model<NotificationDeliveryDocument>) ||
  model<NotificationDeliveryDocument>(
    "NotificationDelivery",
    NotificationDeliverySchema,
  );
