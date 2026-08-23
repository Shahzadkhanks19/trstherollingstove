import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const InventoryReportRequestSchema = new Schema(
  {
    reportType: {
      type: String,
      enum: [
        "valuation",
        "consumption",
        "expiry",
        "abc_analysis",
        "stock_ledger",
      ],
      required: true,
      index: true,
    },
    filters: {
      type: Schema.Types.Mixed,
      default: {},
    },
    format: {
      type: String,
      enum: ["json", "csv"],
      default: "csv",
    },
    status: {
      type: String,
      enum: ["queued", "processing", "completed", "failed"],
      default: "queued",
      index: true,
    },
    downloadUrl: {
      type: String,
      default: "",
      trim: true,
    },
    errorMessage: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
    rowCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    startedAt: {
      type: Date,
      default: null,
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

InventoryReportRequestSchema.index({
  requestedBy: 1,
  createdAt: -1,
});

export type InventoryReportRequestDocument =
  InferSchemaType<typeof InventoryReportRequestSchema>;

export const InventoryReportRequest:
  Model<InventoryReportRequestDocument> =
    (models.InventoryReportRequest as
      | Model<InventoryReportRequestDocument>
      | undefined) ??
    model<InventoryReportRequestDocument>(
      "InventoryReportRequest",
      InventoryReportRequestSchema,
    );
