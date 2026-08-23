import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
const InventoryUnitSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  symbol: { type: String, required: true, trim: true, lowercase: true, maxlength: 20, unique: true, index: true },
  unitType: { type: String, enum: ["weight", "volume", "count", "packaging"], required: true, index: true },
  baseUnitSymbol: { type: String, trim: true, lowercase: true, maxlength: 20, default: "" },
  conversionFactor: { type: Number, min: 0.000001, default: 1 },
  decimalPrecision: { type: Number, min: 0, max: 6, default: 3 },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true, versionKey: false });
export type InventoryUnitDocument = InferSchemaType<typeof InventoryUnitSchema>;
export const InventoryUnit: Model<InventoryUnitDocument> =
  (models.InventoryUnit as Model<InventoryUnitDocument>) || model<InventoryUnitDocument>("InventoryUnit", InventoryUnitSchema);
