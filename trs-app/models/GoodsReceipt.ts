import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const GoodsReceiptItemSchema = new Schema(
  {
    purchaseOrderItemId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    inventoryItemId: {
      type: Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
    },
    receivedQuantity: {
      type: Number,
      min: 0.0001,
      required: true,
    },
    acceptedQuantity: {
      type: Number,
      min: 0,
      required: true,
    },
    rejectedQuantity: {
      type: Number,
      min: 0,
      required: true,
    },
    unitCost: {
      type: Number,
      min: 0,
      required: true,
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
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  {
    _id: true,
    versionKey: false,
  },
);

const GoodsReceiptSchema = new Schema(
  {
    goodsReceiptNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    purchaseOrderId: {
      type: Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      required: true,
      index: true,
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
      index: true,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    invoiceNumber: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
    invoiceDate: {
      type: Date,
      default: null,
    },
    items: {
      type: [GoodsReceiptItemSchema],
      required: true,
    },
    acceptedValue: {
      type: Number,
      min: 0,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    receivedBy: {
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

GoodsReceiptSchema.index({
  purchaseOrderId: 1,
  receivedAt: -1,
});

export type GoodsReceiptDocument =
  InferSchemaType<typeof GoodsReceiptSchema>;

export const GoodsReceipt: Model<GoodsReceiptDocument> =
  (models.GoodsReceipt as Model<GoodsReceiptDocument>) ||
  model<GoodsReceiptDocument>(
    "GoodsReceipt",
    GoodsReceiptSchema,
  );
