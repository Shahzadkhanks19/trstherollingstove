import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const POSItemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    sku: { type: String, required: true, trim: true, uppercase: true, maxlength: 60, unique: true, index: true },
    category: { type: String, required: true, trim: true, maxlength: 100, index: true },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    imageUrl: { type: String, trim: true, maxlength: 500, default: "" },
    sellingPrice: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, min: 0, max: 100, default: 0 },
    trackInventory: { type: Boolean, default: false },
    inventoryItemId: { type: Schema.Types.ObjectId, ref: "InventoryItem", default: null },
    sendToKds: { type: Boolean, default: false },
    kitchenStationId: { type: Schema.Types.ObjectId, ref: "KitchenStation", default: null },
    allowCustomPrice: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, versionKey: false },
);

POSItemSchema.index({ isActive: 1, category: 1, sortOrder: 1, name: 1 });

export type POSItemDocument = InferSchemaType<typeof POSItemSchema>;
export const POSItem: Model<POSItemDocument> =
  (models.POSItem as Model<POSItemDocument>) || model<POSItemDocument>("POSItem", POSItemSchema);
