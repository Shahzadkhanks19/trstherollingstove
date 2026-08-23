import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const ProcurementIntelligenceRunSchema = new Schema(
  {
    status: {
      type: String,
      enum: ["running", "completed", "failed"],
      default: "running",
      index: true,
    },
    lookbackDays: { type: Number, min: 14, max: 730, required: true },
    horizonDays: { type: Number, min: 1, max: 180, required: true },
    leadTimeDays: { type: Number, min: 1, max: 90, required: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    startedAt: { type: Date, required: true, default: Date.now },
    completedAt: { type: Date, default: null },
    durationMs: { type: Number, min: 0, default: 0 },
    itemCount: { type: Number, min: 0, default: 0 },
    criticalCount: { type: Number, min: 0, default: 0 },
    netPurchaseValue: { type: Number, min: 0, default: 0 },
    errorMessage: { type: String, trim: true, maxlength: 2000, default: "" },
    result: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true, versionKey: false },
);

ProcurementIntelligenceRunSchema.index({
  status: 1,
  lookbackDays: 1,
  horizonDays: 1,
  leadTimeDays: 1,
  createdAt: -1,
});

export type ProcurementIntelligenceRunDocument =
  InferSchemaType<typeof ProcurementIntelligenceRunSchema>;

export const ProcurementIntelligenceRun:
  Model<ProcurementIntelligenceRunDocument> =
    (models.ProcurementIntelligenceRun as
      | Model<ProcurementIntelligenceRunDocument>
      | undefined) ??
    model<ProcurementIntelligenceRunDocument>(
      "ProcurementIntelligenceRun",
      ProcurementIntelligenceRunSchema,
    );
