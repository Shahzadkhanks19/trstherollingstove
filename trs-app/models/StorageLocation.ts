import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
const StorageLocationSchema = new Schema({
  warehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  code: { type: String, required: true, trim: true, uppercase: true, maxlength: 30 },
  locationType: { type: String, enum: ["ambient", "chilled", "frozen", "dry", "packaging", "other"], default: "ambient", index: true },
  temperatureMin: { type: Number, default: null },
  temperatureMax: { type: Number, default: null },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true, versionKey: false });
StorageLocationSchema.index({ warehouseId: 1, code: 1 }, { unique: true });
StorageLocationSchema.index({ warehouseId: 1, isActive: 1, name: 1 });
export type StorageLocationDocument = InferSchemaType<typeof StorageLocationSchema>;
export const StorageLocation: Model<StorageLocationDocument> =
  (models.StorageLocation as Model<StorageLocationDocument>) || model<StorageLocationDocument>("StorageLocation", StorageLocationSchema);
