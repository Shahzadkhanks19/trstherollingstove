import { requirePermission } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors/handleApiError";
import { getBudgetForecastSummary } from "@/services/budgeting-forecasting.service";
import { budgetForecastQuerySchema } from "@/validators/budgeting-forecasting";

const csv = (value: unknown) => `"${String(value ?? "").replaceAll('"','""')}"`;
export async function GET(request: Request) {
  try {
    await requirePermission("reports.read");
    const url = new URL(request.url);
    const input = budgetForecastQuerySchema.parse({ fiscalYear:url.searchParams.get("fiscalYear") ?? undefined, scenario:url.searchParams.get("scenario") ?? undefined, department:url.searchParams.get("department") ?? undefined });
    const { snapshot } = await getBudgetForecastSummary(input);
    if (!snapshot?.metrics) throw new Error("Budget forecast metrics are unavailable.");
    const lines = [
      ["Budgeting & Forecasting", input.fiscalYear, input.scenario, input.department],
      [],
      ["Metric","Amount"],
      ["Budget revenue", snapshot.metrics.budgetRevenue],
      ["Forecast revenue", snapshot.metrics.forecastRevenue],
      ["Revenue variance", snapshot.metrics.revenueVariance],
      ["Budget expenses", snapshot.metrics.budgetExpenses],
      ["Forecast expenses", snapshot.metrics.forecastExpenses],
      ["Expense variance", snapshot.metrics.expenseVariance],
      ["Forecast profit", snapshot.metrics.forecastProfit],
      ["Projected cash balance", snapshot.metrics.projectedCashBalance],
      ["Cash runway months", snapshot.metrics.cashRunwayMonths],
      [],
      ["Month","Budget revenue","Actual revenue","Forecast revenue","Revenue variance","Budget expenses","Actual expenses","Forecast expenses","Expense variance","Forecast profit","Forecast cash balance"],
      ...(snapshot.monthly ?? []).map((item) => [item.month,item.budgetRevenue,item.actualRevenue,item.forecastRevenue,item.revenueVariance,item.budgetExpenses,item.actualExpenses,item.forecastExpenses,item.expenseVariance,item.forecastProfit,item.forecastCashBalance]),
    ];
    return new Response(lines.map((line)=>line.map(csv).join(",")).join("\n"), { headers:{ "Content-Type":"text/csv; charset=utf-8", "Content-Disposition":`attachment; filename="budget-forecast-${input.fiscalYear}-${input.scenario}.csv"` } });
  } catch (error) { return handleApiError(error); }
}
