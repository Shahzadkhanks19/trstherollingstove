import { Schema, model, models, type Model, type Types } from "mongoose";
import type {
  ProductionInputLine,
  ProductionOrderStatus,
  ProductionOutputLine,
} from "@/types/production-vendor";

export interface ProductionOrderDocument {
  _id: Types.ObjectId;
  orderNumber: string;
  title: string;
  notes: string;
  status: ProductionOrderStatus;
  warehouseId: Types.ObjectId;
  recipeId?: Types.ObjectId | null;
  plannedStartAt?: Date | null;
  plannedEndAt?: Date | null;
  approvedAt?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  cancelledAt?: Date | null;
  cancellationReason: string;
  plannedYield: number;
  actualYield: number;
  yieldUnit: string;
  inputs: ProductionInputLine[];
  outputs: ProductionOutputLine[];
  estimatedCost: number;
  actualCost: number;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  approvedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const ProductionLineSchema = new Schema(
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

const ProductionOrderSchema = new Schema<ProductionOrderDocument>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    notes: { type: String, default: "", trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: ["draft", "approved", "in_progress", "completed", "cancelled"],
      default: "draft",
      required: true,
      index: true,
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "InventoryWarehouse",
      required: true,
      index: true,
    },
    recipeId: {
      type: Schema.Types.ObjectId,
      ref: "Recipe",
      default: null,
      index: true,
    },
    plannedStartAt: { type: Date, default: null, index: true },
    plannedEndAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancellationReason: { type: String, default: "", trim: true, maxlength: 500 },
    plannedYield: { type: Number, required: true, min: 0 },
    actualYield: { type: Number, required: true, min: 0, default: 0 },
    yieldUnit: { type: String, required: true, trim: true, maxlength: 40 },
    inputs: { type: [ProductionLineSchema], default: [] },
    outputs: { type: [ProductionLineSchema], default: [] },
    estimatedCost: { type: Number, required: true, min: 0, default: 0 },
    actualCost: { type: Number, required: true, min: 0, default: 0 },
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
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "AdminUser",
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);

ProductionOrderSchema.index({ status: 1, plannedStartAt: 1 });
ProductionOrderSchema.index({ warehouseId: 1, createdAt: -1 });

export const ProductionOrder: Model<ProductionOrderDocument> =
  (models.ProductionOrder as Model<ProductionOrderDocument> | undefined) ??
  model<ProductionOrderDocument>("ProductionOrder", ProductionOrderSchema);
