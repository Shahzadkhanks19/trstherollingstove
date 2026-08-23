import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const StatementRowSchema = new Schema({
  key: { type: String, required: true, trim: true },
  label: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, default: 0 },
  debit: { type: Number, required: true, min: 0, default: 0 },
  credit: { type: Number, required: true, min: 0, default: 0 },
}, { _id: false, versionKey: false });

const TrendRowSchema = new Schema({
  date: { type: String, required: true },
  revenue: { type: Number, required: true, default: 0 },
  expenses: { type: Number, required: true, default: 0 },
  profit: { type: Number, required: true, default: 0 },
}, { _id: false, versionKey: false });

const FinancialReportSnapshotSchema = new Schema({
  periodKey: { type: String, required: true, unique: true, index: true },
  periodStart: { type: Date, required: true, index: true },
  periodEnd: { type: Date, required: true, index: true },
  currency: { type: String, required: true, uppercase: true, default: "INR" },
  metrics: {
    grossRevenue: { type: Number, required: true, default: 0 },
    netRevenue: { type: Number, required: true, default: 0 },
    operatingExpenses: { type: Number, required: true, default: 0 },
    grossProfit: { type: Number, required: true, default: 0 },
    netProfit: { type: Number, required: true, default: 0 },
    profitMargin: { type: Number, required: true, default: 0 },
    cashInflows: { type: Number, required: true, default: 0 },
    cashOutflows: { type: Number, required: true, default: 0 },
    netCashFlow: { type: Number, required: true, default: 0 },
    accountsReceivable: { type: Number, required: true, default: 0 },
    accountsPayable: { type: Number, required: true, default: 0 },
    outputTax: { type: Number, required: true, default: 0 },
    inputTax: { type: Number, required: true, default: 0 },
    netTaxPayable: { type: Number, required: true, default: 0 },
    currentAssets: { type: Number, required: true, default: 0 },
    currentLiabilities: { type: Number, required: true, default: 0 },
    workingCapital: { type: Number, required: true, default: 0 },
  },
  profitAndLoss: { type: [StatementRowSchema], default: [] },
  cashFlow: { type: [StatementRowSchema], default: [] },
  balanceSheet: { type: [StatementRowSchema], default: [] },
  trialBalance: { type: [StatementRowSchema], default: [] },
  gstSummary: { type: [StatementRowSchema], default: [] },
  trend: { type: [TrendRowSchema], default: [] },
  generatedAt: { type: Date, required: true, default: Date.now, index: true },
  generatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  source: { type: String, enum: ["manual", "scheduled", "system"], default: "system" },
}, { timestamps: true, versionKey: false });

FinancialReportSnapshotSchema.index({ periodStart: -1, periodEnd: -1 });
export type FinancialReportSnapshotRecord = InferSchemaType<typeof FinancialReportSnapshotSchema>;
export const FinancialReportSnapshot: Model<FinancialReportSnapshotRecord> =
  (models.FinancialReportSnapshot as Model<FinancialReportSnapshotRecord>) ||
  model<FinancialReportSnapshotRecord>("FinancialReportSnapshot", FinancialReportSnapshotSchema);
