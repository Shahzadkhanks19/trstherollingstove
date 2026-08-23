import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const InventoryAutomationJobSchema = new Schema(
  {
    jobType: {
      type: String,
      required: true,
      enum: [
        "alert_scan",
        "daily_summary",
        "weekly_report",
        "monthly_valuation",
        "expiry_report",
        "consumption_report",
        "abc_analysis",
      ],
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["queued", "running", "completed", "failed", "cancelled"],
      default: "queued",
      index: true,
    },
    source: {
      type: String,
      required: true,
      enum: ["manual", "cron", "system"],
      default: "system",
      index: true,
    },
    scheduleKey: {
      type: String,
      trim: true,
      maxlength: 120,
      index: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      default: {},
    },
    result: {
      type: Schema.Types.Mixed,
      default: {},
    },
    attempts: {
      type: Number,
      min: 0,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      min: 1,
      max: 10,
      default: 3,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    failedAt: {
      type: Date,
      default: null,
    },
    nextRetryAt: {
      type: Date,
      default: null,
      index: true,
    },
    errorMessage: {
      type: String,
      trim: true,
      maxlength: 4000,
      default: "",
    },
    durationMs: {
      type: Number,
      min: 0,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

InventoryAutomationJobSchema.index({
  status: 1,
  nextRetryAt: 1,
  createdAt: 1,
});
InventoryAutomationJobSchema.index({
  jobType: 1,
  createdAt: -1,
});

export type InventoryAutomationJobDocument =
  InferSchemaType<typeof InventoryAutomationJobSchema>;

export const InventoryAutomationJob:
  Model<InventoryAutomationJobDocument> =
    (models.InventoryAutomationJob as
      | Model<InventoryAutomationJobDocument>
      | undefined) ??
    model<InventoryAutomationJobDocument>(
      "InventoryAutomationJob",
      InventoryAutomationJobSchema,
    );
