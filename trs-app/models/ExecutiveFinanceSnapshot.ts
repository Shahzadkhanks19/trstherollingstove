import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const AlertSchema = new Schema({
  severity: { type: String, enum: ["info", "warning", "critical"], required: true },
  code: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  value: { type: Number, required: true, default: 0 },
}, { _id: false, versionKey: false });

const TrendSchema = new Schema({
  date: { type: String, required: true },
  revenue: { type: Number, required: true, default: 0 },
  expenses: { type: Number, required: true, default: 0 },
  profit: { type: Number, required: true, default: 0 },
}, { _id: false, versionKey: false });

const ExecutiveFinanceSnapshotSchema = new Schema({
  periodKey: { type: String, required: true, unique: true, index: true },
  periodStart: { type: Date, required: true, index: true },
  periodEnd: { type: Date, required: true, index: true },
  fiscalYear: { type: Number, required: true, index: true },
  scenario: { type: String, enum: ["base", "optimistic", "conservative"], required: true, default: "base" },
  currency: { type: String, required: true, uppercase: true, default: "INR" },
  metrics: {
    grossRevenue: { type: Number, required: true, default: 0 },
    netRevenue: { type: Number, required: true, default: 0 },
    operatingExpenses: { type: Number, required: true, default: 0 },
    netProfit: { type: Number, required: true, default: 0 },
    profitMargin: { type: Number, required: true, default: 0 },
    cashInflows: { type: Number, required: true, default: 0 },
    cashOutflows: { type: Number, required: true, default: 0 },
    netCashFlow: { type: Number, required: true, default: 0 },
    accountsReceivable: { type: Number, required: true, default: 0 },
    accountsPayable: { type: Number, required: true, default: 0 },
    workingCapital: { type: Number, required: true, default: 0 },
    netTaxPayable: { type: Number, required: true, default: 0 },
    forecastRevenue: { type: Number, required: true, default: 0 },
    forecastExpenses: { type: Number, required: true, default: 0 },
    forecastProfit: { type: Number, required: true, default: 0 },
    projectedCashBalance: { type: Number, required: true, default: 0 },
    cashRunwayMonths: { type: Number, required: true, default: 0 },
    forecastAccuracy: { type: Number, required: true, default: 0 },
    currentRatio: { type: Number, required: true, default: 0 },
    receivableToPayableRatio: { type: Number, required: true, default: 0 },
  },
  alerts: { type: [AlertSchema], default: [] },
  trend: { type: [TrendSchema], default: [] },
  generatedAt: { type: Date, required: true, default: Date.now, index: true },
  generatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  source: { type: String, enum: ["manual", "scheduled", "system"], default: "system" },
}, { timestamps: true, versionKey: false });

ExecutiveFinanceSnapshotSchema.index({ periodEnd: -1, fiscalYear: -1, scenario: 1 });
export type ExecutiveFinanceSnapshotRecord = InferSchemaType<typeof ExecutiveFinanceSnapshotSchema>;
export const ExecutiveFinanceSnapshot: Model<ExecutiveFinanceSnapshotRecord> =
  (models.ExecutiveFinanceSnapshot as Model<ExecutiveFinanceSnapshotRecord>) ||
  model<ExecutiveFinanceSnapshotRecord>("ExecutiveFinanceSnapshot", ExecutiveFinanceSnapshotSchema);
