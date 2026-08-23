import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const StockCountLineSchema = new Schema({
  inventoryItemId: { type: Schema.Types.ObjectId, ref: "InventoryItem", required: true },
  itemName: { type: String, required: true, trim: true, maxlength: 180 },
  systemQuantity: { type: Number, required: true, min: 0 },
  countedQuantity: { type: Number, required: true, min: 0 },
  varianceQuantity: { type: Number, required: true },
  unitCost: { type: Number, default: 0, min: 0 },
  varianceValue: { type: Number, required: true },
  reason: { type: String, trim: true, maxlength: 500, default: "" },
}, { _id: true, versionKey: false });

const StockCountSchema = new Schema({
  countNumber: { type: String, required: true, unique: true, index: true, trim: true },
  warehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse", default: null, index: true },
  countType: { type: String, enum: ["full", "cycle", "spot"], default: "cycle", index: true },
  status: { type: String, enum: ["draft", "posted", "cancelled"], default: "draft", index: true },
  countedAt: { type: Date, default: Date.now, index: true },
  items: { type: [StockCountLineSchema], required: true, validate: { validator: (value: unknown[]) => value.length > 0, message: "At least one counted item is required." } },
  notes: { type: String, trim: true, maxlength: 1000, default: "" },
  postedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  postedAt: { type: Date, default: null },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true, versionKey: false });

StockCountSchema.index({ status: 1, countedAt: -1 });
export type StockCountDocument = InferSchemaType<typeof StockCountSchema>;
export const StockCount: Model<StockCountDocument> = (models.StockCount as Model<StockCountDocument>) || model<StockCountDocument>("StockCount", StockCountSchema);
