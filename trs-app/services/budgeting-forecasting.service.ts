import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { BudgetPlan } from "@/models/BudgetPlan";
import { BudgetForecastSnapshot } from "@/models/BudgetForecastSnapshot";
import { FinancialReportSnapshot } from "@/models/FinancialReportSnapshot";

const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const scenarioFactor = { base: 1, optimistic: 1.1, conservative: 0.9 } as const;
export type BudgetScenario = keyof typeof scenarioFactor;

type BudgetInput = { name:string; fiscalYear:number; department:string; scenario:BudgetScenario; allocations:Array<{month:string;revenueBudget:number;expenseBudget:number;capitalBudget:number;notes?:string}>; assumptions:string[]; growthRate:number; inflationRate:number };
export async function createBudgetPlan(input: BudgetInput, actorId: string) {
  await connectToDatabase();
  return BudgetPlan.create({ ...input, createdBy: new Types.ObjectId(actorId) });
}
export async function updateBudgetPlan(id: string, input: Partial<BudgetInput>) {
  await connectToDatabase();
  return BudgetPlan.findByIdAndUpdate(id, { $set: input }, { returnDocument: "after", runValidators: true }).lean();
}
export async function transitionBudgetPlan(id: string, action: "submit"|"approve"|"reject"|"archive", actorId: string, reason?: string) {
  await connectToDatabase();
  const update: Record<string, unknown> = {};
  if (action === "submit") Object.assign(update, { status: "submitted", submittedAt: new Date(), rejectionReason: "" });
  if (action === "approve") Object.assign(update, { status: "approved", approvedAt: new Date(), approvedBy: new Types.ObjectId(actorId), rejectionReason: "" });
  if (action === "reject") Object.assign(update, { status: "rejected", rejectionReason: reason || "Rejected during review." });
  if (action === "archive") Object.assign(update, { status: "archived" });
  return BudgetPlan.findByIdAndUpdate(id, { $set: update }, { returnDocument: "after", runValidators: true }).lean();
}

function emptyActuals() { return { revenue: 0, expenses: 0, netCashFlow: 0 }; }
export async function buildBudgetForecastSnapshot(input: { fiscalYear:number; scenario:BudgetScenario; department:string; source:"manual"|"scheduled"|"system"; generatedBy?:string|null }) {
  await connectToDatabase();
  const plan = await BudgetPlan.findOne({ fiscalYear: input.fiscalYear, scenario: input.scenario, department: input.department, status: { $in: ["approved", "submitted", "draft"] } }).sort({ status: 1, updatedAt: -1 }).lean();
  const latestReport = await FinancialReportSnapshot.findOne({}).sort({ periodEnd: -1 }).lean();
  const actual = latestReport?.metrics ? { revenue: Number(latestReport.metrics.netRevenue), expenses: Number(latestReport.metrics.operatingExpenses), netCashFlow: Number(latestReport.metrics.netCashFlow) } : emptyActuals();
  const allocations = plan?.allocations ?? Array.from({ length: 12 }, (_, index) => ({ month: `${input.fiscalYear}-${String(index + 1).padStart(2, "0")}`, revenueBudget: 0, expenseBudget: 0, capitalBudget: 0, notes: "" }));
  const factor = scenarioFactor[input.scenario];
  const growth = 1 + Number(plan?.growthRate ?? 0) / 100;
  const inflation = 1 + Number(plan?.inflationRate ?? 0) / 100;
  const elapsedMonth = new Date().getUTCFullYear() === input.fiscalYear ? new Date().getUTCMonth() + 1 : input.fiscalYear < new Date().getUTCFullYear() ? 12 : 0;
  const monthlyActualRevenue = elapsedMonth ? actual.revenue / elapsedMonth : 0;
  const monthlyActualExpenses = elapsedMonth ? actual.expenses / elapsedMonth : 0;
  let runningCash = Math.max(0, actual.netCashFlow);
  const monthly = allocations.map((item, index) => {
    const isElapsed = index < elapsedMonth;
    const actualRevenue = isElapsed ? monthlyActualRevenue : 0;
    const actualExpenses = isElapsed ? monthlyActualExpenses : 0;
    const forecastRevenue = isElapsed ? actualRevenue : Number(item.revenueBudget) * factor * growth;
    const forecastExpenses = isElapsed ? actualExpenses : (Number(item.expenseBudget) + Number(item.capitalBudget)) * (input.scenario === "optimistic" ? 0.95 : input.scenario === "conservative" ? 1.1 : 1) * inflation;
    const forecastProfit = forecastRevenue - forecastExpenses;
    runningCash += forecastProfit;
    return { month:item.month, budgetRevenue:round(Number(item.revenueBudget)), actualRevenue:round(actualRevenue), forecastRevenue:round(forecastRevenue), revenueVariance:round(forecastRevenue-Number(item.revenueBudget)), budgetExpenses:round(Number(item.expenseBudget)+Number(item.capitalBudget)), actualExpenses:round(actualExpenses), forecastExpenses:round(forecastExpenses), expenseVariance:round(forecastExpenses-(Number(item.expenseBudget)+Number(item.capitalBudget))), forecastProfit:round(forecastProfit), forecastCashBalance:round(runningCash) };
  });
  const sum = (key: keyof (typeof monthly)[number]) => monthly.reduce((total, item) => total + Number(item[key]), 0);
  const budgetRevenue = sum("budgetRevenue"), forecastRevenue = sum("forecastRevenue"), budgetExpenses = sum("budgetExpenses"), forecastExpenses = sum("forecastExpenses");
  const averageBurn = monthly.length ? Math.max(0, forecastExpenses - forecastRevenue) / monthly.length : 0;
  const metrics = { budgetRevenue:round(budgetRevenue), actualRevenue:round(actual.revenue), forecastRevenue:round(forecastRevenue), revenueVariance:round(forecastRevenue-budgetRevenue), budgetExpenses:round(budgetExpenses), actualExpenses:round(actual.expenses), forecastExpenses:round(forecastExpenses), expenseVariance:round(forecastExpenses-budgetExpenses), budgetProfit:round(budgetRevenue-budgetExpenses), forecastProfit:round(forecastRevenue-forecastExpenses), projectedCashBalance:round(runningCash), cashRunwayMonths:averageBurn ? round(Math.max(0, runningCash)/averageBurn) : 999, forecastAccuracy: budgetRevenue ? round(Math.max(0, 100-Math.abs((forecastRevenue-budgetRevenue)/budgetRevenue)*100)) : 0 };
  const periodKey = `${input.fiscalYear}_${input.scenario}_${input.department.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`;
  return BudgetForecastSnapshot.findOneAndUpdate({ periodKey }, { $set: { fiscalYear:input.fiscalYear, scenario:input.scenario, department:input.department, currency:"INR", metrics, monthly, generatedAt:new Date(), generatedBy:input.generatedBy?new Types.ObjectId(input.generatedBy):null, source:input.source } }, { upsert:true, returnDocument:"after", runValidators:true }).lean();
}
export async function getBudgetForecastSummary(input:{fiscalYear:number;scenario:BudgetScenario;department:string}) {
  await connectToDatabase();
  const periodKey = `${input.fiscalYear}_${input.scenario}_${input.department.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`;
  const snapshot = await BudgetForecastSnapshot.findOne({ periodKey }).lean();
  const budgets = await BudgetPlan.find({ fiscalYear:input.fiscalYear }).sort({ department:1, scenario:1 }).lean();
  return { snapshot: snapshot ?? await buildBudgetForecastSnapshot({ ...input, source:"system" }), budgets };
}
