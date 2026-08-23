import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const alertTypes = [
  "low_stock",
  "reorder",
  "near_expiry",
  "expired",
  "overstock",
  "negative_stock",
  "slow_moving",
  "dead_stock",
] as const;

const InventoryAlertRuleSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    type: {
      type: String,
      enum: alertTypes,
      required: true,
      index: true,
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    threshold: {
      type: Number,
      min: 0,
      default: 0,
    },
    inventoryItemId: {
      type: Schema.Types.ObjectId,
      ref: "InventoryItem",
      default: null,
      index: true,
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      default: null,
      index: true,
    },
    notificationChannels: {
      type: [String],
      enum: ["dashboard", "email", "whatsapp"],
      default: ["dashboard"],
    },
    cooldownHours: {
      type: Number,
      min: 1,
      max: 720,
      default: 24,
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

InventoryAlertRuleSchema.index({
  enabled: 1,
  type: 1,
});

export type InventoryAlertRuleDocument =
  InferSchemaType<typeof InventoryAlertRuleSchema>;

export const InventoryAlertRule:
  Model<InventoryAlertRuleDocument> =
    (models.InventoryAlertRule as
      | Model<InventoryAlertRuleDocument>
      | undefined) ??
    model<InventoryAlertRuleDocument>(
      "InventoryAlertRule",
      InventoryAlertRuleSchema,
    );
