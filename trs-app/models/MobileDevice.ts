import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const MobileDeviceSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    installationId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      index: true,
    },
    platform: {
      type: String,
      required: true,
      enum: ["android", "ios"],
      index: true,
    },
    pushToken: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    deviceName: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },
    appVersion: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "",
    },
    osVersion: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "",
    },
    locale: {
      type: String,
      trim: true,
      maxlength: 30,
      default: "en-IN",
    },
    timezone: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "Asia/Kolkata",
    },
    notificationsEnabled: {
      type: Boolean,
      default: true,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true, versionKey: false },
);

MobileDeviceSchema.index(
  { userId: 1, installationId: 1 },
  { unique: true },
);
MobileDeviceSchema.index({ pushToken: 1 }, { sparse: true });

export type MobileDeviceDocument = InferSchemaType<typeof MobileDeviceSchema>;
export const MobileDevice: Model<MobileDeviceDocument> =
  (models.MobileDevice as Model<MobileDeviceDocument>) ||
  model<MobileDeviceDocument>("MobileDevice", MobileDeviceSchema);
