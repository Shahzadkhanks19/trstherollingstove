import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const InventoryCategorySchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  code: { type: String, required: true, trim: true, uppercase: true, maxlength: 30, unique: true, index: true },
  description: { type: String, trim: true, maxlength: 500, default: "" },
  sortOrder: { type: Number, min: 0, default: 0 },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true, versionKey: false });
InventoryCategorySchema.index({ isActive: 1, sortOrder: 1, name: 1 });
export type InventoryCategoryDocument = InferSchemaType<typeof InventoryCategorySchema>;
export const InventoryCategory: Model<InventoryCategoryDocument> =
  (models.InventoryCategory as Model<InventoryCategoryDocument>) || model<InventoryCategoryDocument>("InventoryCategory", InventoryCategorySchema);
