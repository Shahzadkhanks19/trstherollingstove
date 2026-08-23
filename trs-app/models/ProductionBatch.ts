import { Schema, model, models, type Model, type Types } from "mongoose";
import type {
  ProductionBatchStatus,
  ProductionInputLine,
  ProductionOutputLine,
} from "@/types/production-vendor";

export interface ProductionBatchDocument {
  _id: Types.ObjectId;
  batchNumber: string;
  productionOrderId: Types.ObjectId;
  warehouseId: Types.ObjectId;
  status: ProductionBatchStatus;
  startedAt?: Date | null;
  completedAt?: Date | null;
  expiryAt?: Date | null;
  inputs: ProductionInputLine[];
  outputs: ProductionOutputLine[];
  wastageQuantity: number;
  wastageUnit: string;
  wastageReason: string;
  notes: string;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BatchLineSchema = new Schema(
  {
    inventoryItemId: {
      type: Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
      index: true,
    },
    nameSnapshot: { type: String, required: true, trim: true },
    unitSnapshot: { type: String, required: true, trim: true },
    plannedQuantity: { type: Number, required: true, min: 0 },
    actualQuantity: { type: Number, required: true, min: 0, default: 0 },
    unitCost: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: true }
);

const ProductionBatchSchema = new Schema<ProductionBatchDocument>(
  {
    batchNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    productionOrderId: {
      type: Schema.Types.ObjectId,
      ref: "ProductionOrder",
      required: true,
      index: true,
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "InventoryWarehouse",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["planned", "in_progress", "completed", "failed", "cancelled"],
      default: "planned",
      required: true,
      index: true,
    },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    expiryAt: { type: Date, default: null, index: true },
    inputs: { type: [BatchLineSchema], default: [] },
    outputs: { type: [BatchLineSchema], default: [] },
    wastageQuantity: { type: Number, min: 0, default: 0 },
    wastageUnit: { type: String, trim: true, default: "" },
    wastageReason: { type: String, trim: true, default: "", maxlength: 500 },
    notes: { type: String, trim: true, default: "", maxlength: 2000 },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "AdminUser",
      required: true,
      index: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "AdminUser",
      required: true,
    },
  },
  { timestamps: true, versionKey: false }
);

ProductionBatchSchema.index({ productionOrderId: 1, createdAt: -1 });
ProductionBatchSchema.index({ status: 1, expiryAt: 1 });

export const ProductionBatch: Model<ProductionBatchDocument> =
  (models.ProductionBatch as Model<ProductionBatchDocument> | undefined) ??
  model<ProductionBatchDocument>("ProductionBatch", ProductionBatchSchema);
