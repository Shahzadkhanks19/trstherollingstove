import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const PrintBridgeDeviceSchema = new Schema({
  name: { type: String, trim: true, minlength: 2, maxlength: 120, required: true },
  platform: { type: String, enum: ["android"], default: "android", index: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  isActive: { type: Boolean, default: true, index: true },
  appVersion: { type: String, trim: true, maxlength: 40, default: "" },
  androidVersion: { type: String, trim: true, maxlength: 40, default: "" },
  manufacturer: { type: String, trim: true, maxlength: 80, default: "" },
  modelName: { type: String, trim: true, maxlength: 80, default: "" },
  printerName: { type: String, trim: true, maxlength: 120, default: "" },
  printerAddress: { type: String, trim: true, maxlength: 32, default: "" },
  lastSeenAt: { type: Date, default: null, index: true },
  lastIpAddress: { type: String, trim: true, maxlength: 80, default: "" },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  revokedAt: { type: Date, default: null },
  revokedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true, versionKey: false });

PrintBridgeDeviceSchema.index({ isActive: 1, lastSeenAt: -1 });

export type PrintBridgeDeviceDocument = InferSchemaType<typeof PrintBridgeDeviceSchema>;
export const PrintBridgeDevice: Model<PrintBridgeDeviceDocument> =
  (models.PrintBridgeDevice as Model<PrintBridgeDeviceDocument>) ||
  model<PrintBridgeDeviceDocument>("PrintBridgeDevice", PrintBridgeDeviceSchema);
