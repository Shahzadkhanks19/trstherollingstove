import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const ChannelPreferenceSchema = new Schema(
  {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    whatsapp: { type: Boolean, default: true },
  },
  { _id: false, versionKey: false },
);

const NotificationPreferenceSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    transactional: {
      type: ChannelPreferenceSchema,
      default: () => ({ inApp: true, email: true, whatsapp: true }),
    },
    reservations: {
      type: ChannelPreferenceSchema,
      default: () => ({ inApp: true, email: true, whatsapp: true }),
    },
    rewards: {
      type: ChannelPreferenceSchema,
      default: () => ({ inApp: true, email: true, whatsapp: true }),
    },
    promotions: {
      type: ChannelPreferenceSchema,
      default: () => ({ inApp: true, email: false, whatsapp: false }),
    },
  },
  { timestamps: true, versionKey: false },
);

export type NotificationPreferenceDocument = InferSchemaType<
  typeof NotificationPreferenceSchema
>;

export const NotificationPreference: Model<NotificationPreferenceDocument> =
  (models.NotificationPreference as Model<NotificationPreferenceDocument>) ||
  model<NotificationPreferenceDocument>(
    "NotificationPreference",
    NotificationPreferenceSchema,
  );
