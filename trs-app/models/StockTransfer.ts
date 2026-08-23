import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const StockTransferLineSchema = new Schema({
  inventoryItemId: { type: Schema.Types.ObjectId, ref: "InventoryItem", required: true },
  itemName: { type: String, required: true, trim: true, maxlength: 180 },
  quantity: { type: Number, required: true, min: 0.0001 },
  unitCost: { type: Number, default: 0, min: 0 },
  batchNumber: { type: String, trim: true, maxlength: 100, default: "" },
}, { _id: true, versionKey: false });

const StockTransferSchema = new Schema({
  transferNumber: { type: String, required: true, unique: true, index: true, trim: true },
  fromWarehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true, index: true },
  toWarehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true, index: true },
  status: { type: String, enum: ["draft", "in_transit", "completed", "cancelled"], default: "draft", index: true },
  items: { type: [StockTransferLineSchema], required: true, validate: { validator: (value: unknown[]) => value.length > 0, message: "At least one transfer item is required." } },
  notes: { type: String, trim: true, maxlength: 1000, default: "" },
  dispatchedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true, versionKey: false });

StockTransferSchema.index({ status: 1, createdAt: -1 });
export type StockTransferDocument = InferSchemaType<typeof StockTransferSchema>;
export const StockTransfer: Model<StockTransferDocument> = (models.StockTransfer as Model<StockTransferDocument>) || model<StockTransferDocument>("StockTransfer", StockTransferSchema);
