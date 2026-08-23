import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { BudgetForecastSnapshot } from "@/models/BudgetForecastSnapshot";
import { ExecutiveFinanceSnapshot } from "@/models/ExecutiveFinanceSnapshot";
import { FinancialReportSnapshot } from "@/models/FinancialReportSnapshot";

const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
type Scenario = "base" | "optimistic" | "conservative";
type BuildInput = { days: number; fiscalYear: number; scenario: Scenario; source: "manual" | "scheduled" | "system"; generatedBy?: string | null };

function makeAlerts(metrics: Record<string, number>) {
  const alerts: Array<{ severity: "info" | "warning" | "critical"; code: string; title: string; message: string; value: number }> = [];
  if (metrics.netProfit < 0) alerts.push({ severity: "critical", code: "negative-profit", title: "Negative profitability", message: "Net profit is below zero for the selected reporting period.", value: metrics.netProfit });
  if (metrics.netCashFlow < 0) alerts.push({ severity: "critical", code: "negative-cash-flow", title: "Negative cash flow", message: "Cash outflows exceed cash inflows for the selected period.", value: metrics.netCashFlow });
  if (metrics.workingCapital < 0) alerts.push({ severity: "critical", code: "negative-working-capital", title: "Working-capital pressure", message: "Current liabilities exceed current assets.", value: metrics.workingCapital });
  if (metrics.currentRatio > 0 && metrics.currentRatio < 1) alerts.push({ severity: "warning", code: "low-current-ratio", title: "Low current ratio", message: "Short-term liquidity is below the preferred 1.0 threshold.", value: metrics.currentRatio });
  if (metrics.cashRunwayMonths !== 999 && metrics.cashRunwayMonths < 3) alerts.push({ severity: "critical", code: "short-runway", title: "Short cash runway", message: "Projected cash runway is below three months.", value: metrics.cashRunwayMonths });
  else if (metrics.cashRunwayMonths !== 999 && metrics.cashRunwayMonths < 6) alerts.push({ severity: "warning", code: "runway-watch", title: "Cash runway watch", message: "Projected cash runway is below six months.", value: metrics.cashRunwayMonths });
  if (metrics.accountsReceivable > metrics.accountsPayable * 2 && metrics.accountsReceivable > 0) alerts.push({ severity: "warning", code: "receivable-concentration", title: "Receivables concentration", message: "Outstanding receivables are materially higher than payables.", value: metrics.accountsReceivable });
  if (!alerts.length) alerts.push({ severity: "info", code: "stable", title: "Finance position stable", message: "No critical executive finance thresholds were triggered.", value: 0 });
  return alerts;
}

export async function buildExecutiveFinanceSnapshot(input: BuildInput) {
  await connectToDatabase();
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd);
  periodStart.setUTCDate(periodStart.getUTCDate() - input.days + 1);
  periodStart.setUTCHours(0, 0, 0, 0);
  periodEnd.setUTCHours(23, 59, 59, 999);
  const report = await FinancialReportSnapshot.findOne({ periodStart: { $lte: periodEnd }, periodEnd: { $gte: periodStart } }).sort({ generatedAt: -1 }).lean()
    ?? await FinancialReportSnapshot.findOne({}).sort({ generatedAt: -1 }).lean();
  const budgetKey = `${input.fiscalYear}_${input.scenario}_company`;
  const budget = await BudgetForecastSnapshot.findOne({ periodKey: budgetKey }).lean()
    ?? await BudgetForecastSnapshot.findOne({ fiscalYear: input.fiscalYear, scenario: input.scenario, department: "Company" }).sort({ generatedAt: -1 }).lean();
  const fm = report?.metrics;
  const bm = budget?.metrics;
  const currentAssets = Number(fm?.currentAssets ?? 0);
  const currentLiabilities = Number(fm?.currentLiabilities ?? 0);
  const receivables = Number(fm?.accountsReceivable ?? 0);
  const payables = Number(fm?.accountsPayable ?? 0);
  const metrics = {
    grossRevenue: round(Number(fm?.grossRevenue ?? 0)), netRevenue: round(Number(fm?.netRevenue ?? 0)), operatingExpenses: round(Number(fm?.operatingExpenses ?? 0)), netProfit: round(Number(fm?.netProfit ?? 0)), profitMargin: round(Number(fm?.profitMargin ?? 0)), cashInflows: round(Number(fm?.cashInflows ?? 0)), cashOutflows: round(Number(fm?.cashOutflows ?? 0)), netCashFlow: round(Number(fm?.netCashFlow ?? 0)), accountsReceivable: round(receivables), accountsPayable: round(payables), workingCapital: round(Number(fm?.workingCapital ?? 0)), netTaxPayable: round(Number(fm?.netTaxPayable ?? 0)), forecastRevenue: round(Number(bm?.forecastRevenue ?? 0)), forecastExpenses: round(Number(bm?.forecastExpenses ?? 0)), forecastProfit: round(Number(bm?.forecastProfit ?? 0)), projectedCashBalance: round(Number(bm?.projectedCashBalance ?? 0)), cashRunwayMonths: round(Number(bm?.cashRunwayMonths ?? 0)), forecastAccuracy: round(Number(bm?.forecastAccuracy ?? 0)), currentRatio: currentLiabilities ? round(currentAssets / currentLiabilities) : currentAssets > 0 ? 999 : 0, receivableToPayableRatio: payables ? round(receivables / payables) : receivables > 0 ? 999 : 0,
  };
  const periodKey = `${periodStart.toISOString().slice(0, 10)}_${periodEnd.toISOString().slice(0, 10)}_${input.fiscalYear}_${input.scenario}`;
  return ExecutiveFinanceSnapshot.findOneAndUpdate({ periodKey }, { $set: { periodStart, periodEnd, fiscalYear: input.fiscalYear, scenario: input.scenario, currency: "INR", metrics, alerts: makeAlerts(metrics), trend: report?.trend ?? [], generatedAt: new Date(), generatedBy: input.generatedBy ? new Types.ObjectId(input.generatedBy) : null, source: input.source } }, { upsert: true, returnDocument: "after", runValidators: true }).lean();
}

export async function getExecutiveFinanceSummary(input: { days: number; fiscalYear: number; scenario: Scenario }) {
  await connectToDatabase();
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd);
  periodStart.setUTCDate(periodStart.getUTCDate() - input.days + 1);
  const periodKey = `${periodStart.toISOString().slice(0, 10)}_${periodEnd.toISOString().slice(0, 10)}_${input.fiscalYear}_${input.scenario}`;
  return ExecutiveFinanceSnapshot.findOne({ periodKey }).lean() ?? buildExecutiveFinanceSnapshot({ ...input, source: "system" });
}
