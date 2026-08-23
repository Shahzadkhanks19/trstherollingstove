import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const ExecutiveBISnapshotSchema = new Schema({
  runId: { type: Schema.Types.ObjectId, ref: "ExecutiveBIReportRun", required: true, unique: true },
  periodStart: { type: Date, required: true, index: true },
  periodEnd: { type: Date, required: true, index: true },
  comparisonStart: { type: Date, required: true },
  comparisonEnd: { type: Date, required: true },
  revenue: { type: Number, min: 0, required: true },
  previousRevenue: { type: Number, min: 0, required: true },
  revenueChangePercent: { type: Number, required: true },
  orderCount: { type: Number, min: 0, required: true },
  averageOrderValue: { type: Number, min: 0, required: true },
  purchaseSpend: { type: Number, min: 0, required: true },
  cogs: { type: Number, min: 0, required: true },
  grossProfit: { type: Number, required: true },
  grossMarginPercent: { type: Number, required: true },
  foodCostPercent: { type: Number, min: 0, required: true },
  inventoryValue: { type: Number, min: 0, required: true },
  inventoryTurnover: { type: Number, min: 0, required: true },
  daysInventoryOutstanding: { type: Number, min: 0, required: true },
  carryingCostEstimate: { type: Number, min: 0, required: true },
  deadStockCost: { type: Number, min: 0, required: true },
  overstockCost: { type: Number, min: 0, required: true },
  wastageCost: { type: Number, min: 0, required: true },
  adjustmentLossCost: { type: Number, min: 0, required: true },
  lossPercentOfRevenue: { type: Number, min: 0, required: true },
  supplierPerformanceScore: { type: Number, min: 0, max: 100, required: true },
  forecastConfidenceScore: { type: Number, min: 0, max: 100, required: true },
  forecastHighRiskItems: { type: Number, min: 0, required: true },
  forecastReorderValue: { type: Number, min: 0, required: true },
  procurementEfficiencyScore: { type: Number, min: 0, max: 100, required: true },
  wasteEfficiencyScore: { type: Number, min: 0, max: 100, required: true },
  inventoryEfficiencyScore: { type: Number, min: 0, max: 100, required: true },
  profitabilityScore: { type: Number, min: 0, max: 100, required: true },
  businessHealthScore: { type: Number, min: 0, max: 100, required: true, index: true },
  trends: { type: Schema.Types.Mixed, default: [] },
  categoryInventory: { type: Schema.Types.Mixed, default: [] },
  wasteByCategory: { type: Schema.Types.Mixed, default: [] },
  supplierSpend: { type: Schema.Types.Mixed, default: [] },
  topSellingItems: { type: Schema.Types.Mixed, default: [] },
  insights: { type: [String], default: [] },
  generatedAt: { type: Date, required: true, index: true },
}, { timestamps: true, versionKey: false });

ExecutiveBISnapshotSchema.index({ generatedAt: -1 });
export type ExecutiveBISnapshotDocument = InferSchemaType<typeof ExecutiveBISnapshotSchema>;
export const ExecutiveBISnapshot: Model<ExecutiveBISnapshotDocument> =
  (models.ExecutiveBISnapshot as Model<ExecutiveBISnapshotDocument> | undefined) ??
  model<ExecutiveBISnapshotDocument>("ExecutiveBISnapshot", ExecutiveBISnapshotSchema);
