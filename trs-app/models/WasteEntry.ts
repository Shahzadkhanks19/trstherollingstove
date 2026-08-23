import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const WasteEntrySchema = new Schema({
  wasteNumber: { type: String, required: true, unique: true, index: true, trim: true },
  inventoryItemId: { type: Schema.Types.ObjectId, ref: "InventoryItem", required: true, index: true },
  warehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse", default: null, index: true },
  quantity: { type: Number, required: true, min: 0.0001 },
  unitCost: { type: Number, default: 0, min: 0 },
  totalCost: { type: Number, default: 0, min: 0 },
  wasteType: { type: String, enum: ["spoilage", "expiry", "damage", "production_loss", "theft", "other"], required: true, index: true },
  batchNumber: { type: String, trim: true, maxlength: 100, default: "" },
  reason: { type: String, required: true, trim: true, maxlength: 500 },
  occurredAt: { type: Date, default: Date.now, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true, versionKey: false });

WasteEntrySchema.index({ wasteType: 1, occurredAt: -1 });
export type WasteEntryDocument = InferSchemaType<typeof WasteEntrySchema>;
export const WasteEntry: Model<WasteEntryDocument> = (models.WasteEntry as Model<WasteEntryDocument>) || model<WasteEntryDocument>("WasteEntry", WasteEntrySchema);
