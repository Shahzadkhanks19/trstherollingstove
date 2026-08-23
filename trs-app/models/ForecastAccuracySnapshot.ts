import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const ForecastAccuracySnapshotSchema = new Schema({
  runId: { type: Schema.Types.ObjectId, ref: "BusinessForecastRun", required: true, index: true },
  evaluatedThrough: { type: Date, required: true, index: true },
  sampleDays: { type: Number, min: 0, default: 0 },
  mae: { type: Number, min: 0, default: 0 },
  rmse: { type: Number, min: 0, default: 0 },
  mape: { type: Number, min: 0, default: 0 },
  bias: { type: Number, default: 0 },
  accuracyScore: { type: Number, min: 0, max: 100, default: 0 },
  driftDetected: { type: Boolean, default: false, index: true },
}, { timestamps: true, versionKey: false });
ForecastAccuracySnapshotSchema.index({ runId: 1, createdAt: -1 });

export type ForecastAccuracySnapshotDocument = InferSchemaType<typeof ForecastAccuracySnapshotSchema>;
export const ForecastAccuracySnapshot: Model<ForecastAccuracySnapshotDocument> =
  (models.ForecastAccuracySnapshot as Model<ForecastAccuracySnapshotDocument>) || model<ForecastAccuracySnapshotDocument>("ForecastAccuracySnapshot", ForecastAccuracySnapshotSchema);
