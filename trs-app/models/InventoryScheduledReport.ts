import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const InventoryScheduledReportSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    reportType: {
      type: String,
      required: true,
      enum: [
        "valuation",
        "stock_ledger",
        "consumption",
        "expiry",
        "abc_analysis",
      ],
      index: true,
    },
    frequency: {
      type: String,
      required: true,
      enum: ["daily", "weekly", "monthly"],
      index: true,
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    recipients: {
      type: [String],
      default: [],
    },
    filters: {
      type: Schema.Types.Mixed,
      default: {},
    },
    format: {
      type: String,
      enum: ["csv", "xlsx", "pdf"],
      default: "csv",
    },
    nextRunAt: {
      type: Date,
      required: true,
      index: true,
    },
    lastRunAt: {
      type: Date,
      default: null,
    },
    lastJobId: {
      type: Schema.Types.ObjectId,
      ref: "InventoryAutomationJob",
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

InventoryScheduledReportSchema.index({
  enabled: 1,
  nextRunAt: 1,
});

export type InventoryScheduledReportDocument =
  InferSchemaType<typeof InventoryScheduledReportSchema>;

export const InventoryScheduledReport:
  Model<InventoryScheduledReportDocument> =
    (models.InventoryScheduledReport as
      | Model<InventoryScheduledReportDocument>
      | undefined) ??
    model<InventoryScheduledReportDocument>(
      "InventoryScheduledReport",
      InventoryScheduledReportSchema,
    );
