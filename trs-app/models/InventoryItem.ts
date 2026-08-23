import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const InventoryItemSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 60,
      unique: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    unit: {
      type: String,
      enum: [
        "kg",
        "g",
        "l",
        "ml",
        "piece",
        "packet",
        "box",
        "bottle",
      ],
      required: true,
    },
    currentStock: {
      type: Number,
      min: 0,
      default: 0,
    },
    reorderLevel: {
      type: Number,
      min: 0,
      default: 0,
    },
    idealStockLevel: {
      type: Number,
      min: 0,
      default: 0,
    },
    averageUnitCost: {
      type: Number,
      min: 0,
      default: 0,
    },
    expiryTrackingEnabled: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
    archivedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
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

InventoryItemSchema.index({
  isActive: 1,
  category: 1,
  name: 1,
});

export type InventoryItemDocument =
  InferSchemaType<typeof InventoryItemSchema>;

export const InventoryItem: Model<InventoryItemDocument> =
  (models.InventoryItem as Model<InventoryItemDocument>) ||
  model<InventoryItemDocument>(
    "InventoryItem",
    InventoryItemSchema,
  );
