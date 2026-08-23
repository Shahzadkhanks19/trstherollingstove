import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const MonthlyForecastSchema = new Schema({
  month: { type: String, required: true },
  budgetRevenue: { type: Number, required: true, default: 0 },
  actualRevenue: { type: Number, required: true, default: 0 },
  forecastRevenue: { type: Number, required: true, default: 0 },
  revenueVariance: { type: Number, required: true, default: 0 },
  budgetExpenses: { type: Number, required: true, default: 0 },
  actualExpenses: { type: Number, required: true, default: 0 },
  forecastExpenses: { type: Number, required: true, default: 0 },
  expenseVariance: { type: Number, required: true, default: 0 },
  forecastProfit: { type: Number, required: true, default: 0 },
  forecastCashBalance: { type: Number, required: true, default: 0 },
}, { _id: false, versionKey: false });

const BudgetForecastSnapshotSchema = new Schema({
  periodKey: { type: String, required: true, unique: true, index: true },
  fiscalYear: { type: Number, required: true, index: true },
  scenario: { type: String, enum: ["base", "optimistic", "conservative"], required: true, index: true },
  department: { type: String, required: true, default: "Company", index: true },
  currency: { type: String, required: true, uppercase: true, default: "INR" },
  metrics: {
    budgetRevenue: { type: Number, required: true, default: 0 },
    actualRevenue: { type: Number, required: true, default: 0 },
    forecastRevenue: { type: Number, required: true, default: 0 },
    revenueVariance: { type: Number, required: true, default: 0 },
    budgetExpenses: { type: Number, required: true, default: 0 },
    actualExpenses: { type: Number, required: true, default: 0 },
    forecastExpenses: { type: Number, required: true, default: 0 },
    expenseVariance: { type: Number, required: true, default: 0 },
    budgetProfit: { type: Number, required: true, default: 0 },
    forecastProfit: { type: Number, required: true, default: 0 },
    projectedCashBalance: { type: Number, required: true, default: 0 },
    cashRunwayMonths: { type: Number, required: true, default: 0 },
    forecastAccuracy: { type: Number, required: true, default: 0 },
  },
  monthly: { type: [MonthlyForecastSchema], default: [] },
  generatedAt: { type: Date, required: true, default: Date.now, index: true },
  generatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  source: { type: String, enum: ["manual", "scheduled", "system"], default: "system" },
}, { timestamps: true, versionKey: false });

BudgetForecastSnapshotSchema.index({ fiscalYear: -1, scenario: 1, department: 1 });
export type BudgetForecastSnapshotRecord = InferSchemaType<typeof BudgetForecastSnapshotSchema>;
export const BudgetForecastSnapshot: Model<BudgetForecastSnapshotRecord> =
  (models.BudgetForecastSnapshot as Model<BudgetForecastSnapshotRecord>) || model<BudgetForecastSnapshotRecord>("BudgetForecastSnapshot", BudgetForecastSnapshotSchema);
