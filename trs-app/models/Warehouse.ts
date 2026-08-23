import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
const WarehouseSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  code: { type: String, required: true, trim: true, uppercase: true, maxlength: 30, unique: true, index: true },
  addressLine1: { type: String, trim: true, maxlength: 180, default: "" },
  addressLine2: { type: String, trim: true, maxlength: 180, default: "" },
  city: { type: String, trim: true, maxlength: 80, default: "" },
  state: { type: String, trim: true, maxlength: 80, default: "" },
  postalCode: { type: String, trim: true, maxlength: 20, default: "" },
  contactName: { type: String, trim: true, maxlength: 100, default: "" },
  contactPhone: { type: String, trim: true, maxlength: 20, default: "" },
  isDefault: { type: Boolean, default: false, index: true },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true, versionKey: false });
WarehouseSchema.index({ isActive: 1, name: 1 });
export type WarehouseDocument = InferSchemaType<typeof WarehouseSchema>;
export const Warehouse: Model<WarehouseDocument> =
  (models.Warehouse as Model<WarehouseDocument>) || model<WarehouseDocument>("Warehouse", WarehouseSchema);
