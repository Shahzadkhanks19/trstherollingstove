import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const PurchaseReturnLineSchema = new Schema({
  inventoryItemId: { type: Schema.Types.ObjectId, ref: "InventoryItem", required: true },
  itemName: { type: String, required: true, trim: true, maxlength: 180 },
  quantity: { type: Number, required: true, min: 0.0001 },
  unitCost: { type: Number, required: true, min: 0 },
  lineTotal: { type: Number, required: true, min: 0 },
  batchNumber: { type: String, trim: true, maxlength: 100, default: "" },
  reason: { type: String, trim: true, maxlength: 500, default: "" },
}, { _id: true, versionKey: false });

const PurchaseReturnSchema = new Schema({
  returnNumber: { type: String, required: true, unique: true, index: true, trim: true },
  supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
  purchaseOrderId: { type: Schema.Types.ObjectId, ref: "PurchaseOrder", default: null, index: true },
  status: { type: String, enum: ["draft", "approved", "cancelled"], default: "draft", index: true },
  returnDate: { type: Date, default: Date.now, index: true },
  items: { type: [PurchaseReturnLineSchema], required: true, validate: { validator: (value: unknown[]) => value.length > 0, message: "At least one return item is required." } },
  subtotal: { type: Number, required: true, min: 0 },
  taxTotal: { type: Number, default: 0, min: 0 },
  grandTotal: { type: Number, required: true, min: 0 },
  supplierCreditExpected: { type: Boolean, default: true },
  creditNoteNumber: { type: String, trim: true, maxlength: 120, default: "" },
  notes: { type: String, trim: true, maxlength: 1000, default: "" },
  approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  approvedAt: { type: Date, default: null },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true, versionKey: false });

PurchaseReturnSchema.index({ supplierId: 1, returnDate: -1 });
export type PurchaseReturnDocument = InferSchemaType<typeof PurchaseReturnSchema>;
export const PurchaseReturn: Model<PurchaseReturnDocument> = (models.PurchaseReturn as Model<PurchaseReturnDocument>) || model<PurchaseReturnDocument>("PurchaseReturn", PurchaseReturnSchema);
