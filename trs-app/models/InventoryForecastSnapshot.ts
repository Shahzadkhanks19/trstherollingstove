import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const InventoryForecastSnapshotSchema = new Schema(
  {
    runId: {
      type: Schema.Types.ObjectId,
      ref: "InventoryForecastRun",
      required: true,
      index: true,
    },
    inventoryItemId: {
      type: Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
      index: true,
    },
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    unit: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    currentStock: {
      type: Number,
      min: 0,
      required: true,
    },
    averageDailyDemand: {
      type: Number,
      min: 0,
      required: true,
    },
    forecastDailyDemand: {
      type: Number,
      min: 0,
      required: true,
    },
    forecastWeeklyDemand: {
      type: Number,
      min: 0,
      required: true,
    },
    forecastMonthlyDemand: {
      type: Number,
      min: 0,
      required: true,
    },
    demandStdDev: {
      type: Number,
      min: 0,
      required: true,
    },
    trendPercent: {
      type: Number,
      required: true,
    },
    safetyStock: {
      type: Number,
      min: 0,
      required: true,
    },
    reorderPoint: {
      type: Number,
      min: 0,
      required: true,
    },
    recommendedOrderQuantity: {
      type: Number,
      min: 0,
      required: true,
    },
    recommendedOrderValue: {
      type: Number,
      min: 0,
      required: true,
    },
    daysUntilStockout: {
      type: Number,
      min: 0,
      default: null,
    },
    expectedStockoutDate: {
      type: Date,
      default: null,
      index: true,
    },
    confidenceScore: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
    riskLevel: {
      type: String,
      enum: ["critical", "high", "medium", "low"],
      required: true,
      index: true,
    },
    velocityClass: {
      type: String,
      enum: ["fast", "medium", "slow", "inactive"],
      required: true,
      index: true,
    },
    historyDays: {
      type: Number,
      min: 0,
      required: true,
    },
    activeDemandDays: {
      type: Number,
      min: 0,
      required: true,
    },
    generatedAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

InventoryForecastSnapshotSchema.index({
  runId: 1,
  riskLevel: 1,
  recommendedOrderValue: -1,
});
InventoryForecastSnapshotSchema.index({
  inventoryItemId: 1,
  generatedAt: -1,
});

export type InventoryForecastSnapshotDocument =
  InferSchemaType<typeof InventoryForecastSnapshotSchema>;

export const InventoryForecastSnapshot:
  Model<InventoryForecastSnapshotDocument> =
    (models.InventoryForecastSnapshot as
      | Model<InventoryForecastSnapshotDocument>
      | undefined) ??
    model<InventoryForecastSnapshotDocument>(
      "InventoryForecastSnapshot",
      InventoryForecastSnapshotSchema,
    );
