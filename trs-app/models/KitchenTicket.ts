import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const KitchenTicketItemSchema = new Schema(
  {
    orderItemId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    menuItemId: {
      type: Schema.Types.ObjectId,
      ref: "MenuItem",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    variantName: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
    quantity: {
      type: Number,
      min: 1,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    modifiers: {
      type: [
        {
          name: {
            type: String,
            trim: true,
            maxlength: 120,
          },
          value: {
            type: String,
            trim: true,
            maxlength: 200,
          },
        },
      ],
      default: [],
    },
    status: {
      type: String,
      enum: [
        "queued",
        "accepted",
        "preparing",
        "ready",
        "served",
        "cancelled",
      ],
      default: "queued",
      index: true,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    readyAt: {
      type: Date,
      default: null,
    },
    servedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: true,
    versionKey: false,
  },
);

const KitchenTicketSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    stationId: {
      type: Schema.Types.ObjectId,
      ref: "KitchenStation",
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ["website", "pos", "admin"],
      required: true,
      index: true,
    },
    fulfilmentType: {
      type: String,
      enum: ["dine_in", "pickup"],
      required: true,
      index: true,
    },
    tableLabel: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
    customerName: {
      type: String,
      trim: true,
      maxlength: 160,
      default: "",
    },
    customerPhone: { type: String, trim: true, maxlength: 20, default: "" },
    customerEmail: { type: String, trim: true, maxlength: 254, default: "" },
    orderTakerName: { type: String, trim: true, maxlength: 120, default: "" },
    estimatedReadyAt: { type: Date, default: null, index: true },
    priority: {
      type: String,
      enum: ["normal", "high", "urgent"],
      default: "normal",
      index: true,
    },
    status: {
      type: String,
      enum: [
        "queued",
        "accepted",
        "preparing",
        "ready",
        "served",
        "cancelled",
      ],
      default: "queued",
      index: true,
    },
    items: {
      type: [KitchenTicketItemSchema],
      required: true,
      validate: {
        validator(value: unknown[]) {
          return value.length > 0;
        },
        message: "Kitchen ticket must contain at least one item.",
      },
    },
    acceptedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    readyAt: {
      type: Date,
      default: null,
    },
    servedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    createdFromOrderAt: {
      type: Date,
      default: Date.now,
    },
    autoCompletedAt: {
      type: Date,
      default: null,
      index: true,
    },
    autoCompletionReason: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

KitchenTicketSchema.index({
  stationId: 1,
  status: 1,
  priority: -1,
  createdAt: 1,
});

KitchenTicketSchema.index({
  status: 1,
  createdFromOrderAt: 1,
  autoCompletedAt: 1,
});

KitchenTicketSchema.index(
  {
    orderId: 1,
    stationId: 1,
  },
  {
    unique: true,
  },
);

export type KitchenTicketDocument =
  InferSchemaType<typeof KitchenTicketSchema>;

export const KitchenTicket: Model<KitchenTicketDocument> =
  (models.KitchenTicket as Model<KitchenTicketDocument>) ||
  model<KitchenTicketDocument>(
    "KitchenTicket",
    KitchenTicketSchema,
  );
