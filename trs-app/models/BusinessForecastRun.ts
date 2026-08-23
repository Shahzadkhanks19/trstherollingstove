import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const BusinessForecastRunSchema = new Schema({
  status: { type: String, enum: ["running", "completed", "failed"], default: "running", index: true },
  source: { type: String, enum: ["manual", "api", "scheduled"], default: "manual", index: true },
  lookbackDays: { type: Number, min: 30, max: 730, required: true },
  horizons: { type: [Number], default: [7, 30, 90] },
  requestedBy: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
  startedAt: { type: Date, default: Date.now, required: true },
  completedAt: { type: Date, default: null },
  durationMs: { type: Number, min: 0, default: 0 },
  dataDays: { type: Number, min: 0, default: 0 },
  result: { type: Schema.Types.Mixed, default: null },
  errorMessage: { type: String, trim: true, maxlength: 2000, default: "" },
}, { timestamps: true, versionKey: false });
BusinessForecastRunSchema.index({ createdAt: -1 });

export type BusinessForecastRunDocument = InferSchemaType<typeof BusinessForecastRunSchema>;
export const BusinessForecastRun: Model<BusinessForecastRunDocument> =
  (models.BusinessForecastRun as Model<BusinessForecastRunDocument>) || model<BusinessForecastRunDocument>("BusinessForecastRun", BusinessForecastRunSchema);
