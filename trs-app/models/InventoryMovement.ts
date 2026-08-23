import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const InventoryMovementSchema = new Schema(
  {
    inventoryItemId: {
      type: Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "opening",
        "purchase",
        "sale",
        "adjustment_in",
        "adjustment_out",
        "wastage",
        "return_in",
        "return_out",
        "transfer_in",
        "transfer_out",
      ],
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      min: 0.0001,
      required: true,
    },
    stockBefore: {
      type: Number,
      min: 0,
      required: true,
    },
    stockAfter: {
      type: Number,
      min: 0,
      required: true,
    },
    unitCost: {
      type: Number,
      min: 0,
      default: 0,
    },
    totalCost: {
      type: Number,
      min: 0,
      default: 0,
    },
    referenceType: {
      type: String,
      enum: [
        "manual",
        "order",
        "purchase",
        "return",
        "opening",
        "transfer",
        "stock_count",
        "wastage",
      ],
      default: "manual",
      index: true,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    batchNumber: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
    expiryDate: {
      type: Date,
      default: null,
      index: true,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

InventoryMovementSchema.index({
  inventoryItemId: 1,
  createdAt: -1,
});
InventoryMovementSchema.index({
  referenceType: 1,
  referenceId: 1,
  type: 1,
});

export type InventoryMovementDocument =
  InferSchemaType<typeof InventoryMovementSchema>;

export const InventoryMovement:
  Model<InventoryMovementDocument> =
    (models.InventoryMovement as Model<InventoryMovementDocument>) ||
    model<InventoryMovementDocument>(
      "InventoryMovement",
      InventoryMovementSchema,
    );
