import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const InventoryReportCacheSchema = new Schema(
  {
    cacheKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 500,
    },
    reportType: {
      type: String,
      required: true,
      enum: [
        "valuation",
        "consumption",
        "expiry",
        "abc_analysis",
        "stock_ledger",
      ],
      index: true,
    },
    filters: {
      type: Schema.Types.Mixed,
      default: {},
    },
    rows: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    rowCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    generatedAt: {
      type: Date,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    generationMs: {
      type: Number,
      min: 0,
      default: 0,
    },
    hitCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    lastHitAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

InventoryReportCacheSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 },
);
InventoryReportCacheSchema.index({
  reportType: 1,
  generatedAt: -1,
});

export type InventoryReportCacheDocument =
  InferSchemaType<typeof InventoryReportCacheSchema>;

export const InventoryReportCache:
  Model<InventoryReportCacheDocument> =
    (models.InventoryReportCache as
      | Model<InventoryReportCacheDocument>
      | undefined) ??
    model<InventoryReportCacheDocument>(
      "InventoryReportCache",
      InventoryReportCacheSchema,
    );
