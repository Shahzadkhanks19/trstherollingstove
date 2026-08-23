import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const PurchaseOrderItemSchema = new Schema(
  {
    inventoryItemId: {
      type: Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
    },
    itemName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
    orderedQuantity: {
      type: Number,
      min: 0.0001,
      required: true,
    },
    receivedQuantity: {
      type: Number,
      min: 0,
      default: 0,
    },
    unitCost: {
      type: Number,
      min: 0,
      required: true,
    },
    taxRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    lineSubtotal: {
      type: Number,
      min: 0,
      required: true,
    },
    lineTax: {
      type: Number,
      min: 0,
      required: true,
    },
    lineTotal: {
      type: Number,
      min: 0,
      required: true,
    },
  },
  {
    _id: true,
    versionKey: false,
  },
);

const PurchaseOrderSchema = new Schema(
  {
    purchaseOrderNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
      index: true,
    },
    fulfilmentType: {
      type: String,
      enum: ["vendor_delivery", "self_pickup"],
      required: true,
      default: "vendor_delivery",
      index: true,
    },
    pickupPersonId: { type: Schema.Types.ObjectId, ref: "PickupPerson", default: null },
    pickupPersonName: { type: String, trim: true, maxlength: 120, default: "" },
    pickupPersonWhatsapp: { type: String, trim: true, maxlength: 20, default: "" },
    status: {
      type: String,
      enum: [
        "draft",
        "approved",
        "partially_received",
        "received",
        "cancelled",
      ],
      default: "draft",
      index: true,
    },
    orderDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expectedDeliveryDate: {
      type: Date,
      default: null,
      index: true,
    },
    items: {
      type: [PurchaseOrderItemSchema],
      required: true,
      validate: {
        validator(value: unknown[]) {
          return value.length > 0;
        },
        message:
          "Purchase order must contain at least one item.",
      },
    },
    subtotal: {
      type: Number,
      min: 0,
      required: true,
    },
    taxTotal: {
      type: Number,
      min: 0,
      required: true,
    },
    discountTotal: {
      type: Number,
      min: 0,
      default: 0,
    },
    shippingTotal: {
      type: Number,
      min: 0,
      default: 0,
    },
    grandTotal: {
      type: Number,
      min: 0,
      required: true,
    },
    paidAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    balanceAmount: {
      type: Number,
      min: 0,
      required: true,
    },
    whatsappDeliveries: {
      type: [{
        recipientType: { type: String, enum: ["vendor", "admin", "pickup_person"], required: true },
        destination: { type: String, trim: true, maxlength: 20, default: "" },
        status: { type: String, enum: ["queued", "sent", "failed", "skipped"], default: "queued" },
        provider: { type: String, trim: true, maxlength: 80, default: "" },
        providerMessageId: { type: String, trim: true, maxlength: 200, default: "" },
        failureReason: { type: String, trim: true, maxlength: 1000, default: "" },
        attemptedAt: { type: Date, default: null },
      }],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1500,
      default: "",
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 500,
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

PurchaseOrderSchema.index({
  supplierId: 1,
  status: 1,
  orderDate: -1,
});

export type PurchaseOrderDocument =
  InferSchemaType<typeof PurchaseOrderSchema>;

export const PurchaseOrder: Model<PurchaseOrderDocument> =
  (models.PurchaseOrder as Model<PurchaseOrderDocument>) ||
  model<PurchaseOrderDocument>(
    "PurchaseOrder",
    PurchaseOrderSchema,
  );
