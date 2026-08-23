import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const InventoryAlertEventSchema = new Schema(
  {
    ruleId: {
      type: Schema.Types.ObjectId,
      ref: "InventoryAlertRule",
      required: true,
      index: true,
    },
    inventoryItemId: {
      type: Schema.Types.ObjectId,
      ref: "InventoryItem",
      default: null,
      index: true,
    },
    inventoryMovementId: {
      type: Schema.Types.ObjectId,
      ref: "InventoryMovement",
      default: null,
      index: true,
    },
    type: {
      type: String,
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "warning",
      index: true,
    },
    status: {
      type: String,
      enum: ["open", "acknowledged", "resolved"],
      default: "open",
      index: true,
    },
    fingerprint: {
      type: String,
      required: true,
      unique: true,
      index: true,
      maxlength: 300,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    observedValue: {
      type: Number,
      default: null,
    },
    thresholdValue: {
      type: Number,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    firstDetectedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    lastDetectedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    occurrenceCount: {
      type: Number,
      min: 1,
      default: 1,
    },
    acknowledgedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    acknowledgedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolutionNote: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

InventoryAlertEventSchema.index({
  status: 1,
  severity: 1,
  lastDetectedAt: -1,
});
InventoryAlertEventSchema.index({
  inventoryItemId: 1,
  type: 1,
  status: 1,
});

export type InventoryAlertEventDocument =
  InferSchemaType<typeof InventoryAlertEventSchema>;

export const InventoryAlertEvent:
  Model<InventoryAlertEventDocument> =
    (models.InventoryAlertEvent as
      | Model<InventoryAlertEventDocument>
      | undefined) ??
    model<InventoryAlertEventDocument>(
      "InventoryAlertEvent",
      InventoryAlertEventSchema,
    );
