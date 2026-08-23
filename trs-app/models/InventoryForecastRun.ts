import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const InventoryForecastRunSchema = new Schema(
  {
    status: {
      type: String,
      enum: ["running", "completed", "failed"],
      default: "running",
      index: true,
    },
    source: {
      type: String,
      enum: ["manual", "scheduled", "api"],
      default: "manual",
      index: true,
    },
    lookbackDays: {
      type: Number,
      min: 14,
      max: 730,
      required: true,
    },
    horizonDays: {
      type: Number,
      min: 1,
      max: 180,
      required: true,
    },
    itemCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    highRiskCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    recommendedOrderValue: {
      type: Number,
      min: 0,
      default: 0,
    },
    durationMs: {
      type: Number,
      min: 0,
      default: 0,
    },
    errorMessage: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

InventoryForecastRunSchema.index({ createdAt: -1 });

export type InventoryForecastRunDocument =
  InferSchemaType<typeof InventoryForecastRunSchema>;

export const InventoryForecastRun:
  Model<InventoryForecastRunDocument> =
    (models.InventoryForecastRun as
      | Model<InventoryForecastRunDocument>
      | undefined) ??
    model<InventoryForecastRunDocument>(
      "InventoryForecastRun",
      InventoryForecastRunSchema,
    );
