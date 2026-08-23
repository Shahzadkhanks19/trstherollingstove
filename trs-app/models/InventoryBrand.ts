import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
const InventoryBrandSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100, unique: true, index: true },
  description: { type: String, trim: true, maxlength: 500, default: "" },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true, versionKey: false });
export type InventoryBrandDocument = InferSchemaType<typeof InventoryBrandSchema>;
export const InventoryBrand: Model<InventoryBrandDocument> =
  (models.InventoryBrand as Model<InventoryBrandDocument>) || model<InventoryBrandDocument>("InventoryBrand", InventoryBrandSchema);
