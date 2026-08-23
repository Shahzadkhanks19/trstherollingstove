import { requirePermission } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors/handleApiError";
import { getExecutiveFinanceSummary } from "@/services/executive-finance.service";
import { executiveFinanceQuerySchema } from "@/validators/executive-finance";

const cell = (value: unknown) =>
  `"${String(value ?? "").replaceAll('"', '""')}"`;

export async function GET(request: Request) {
  try {
    await requirePermission("reports.read");

    const url = new URL(request.url);
    const input = executiveFinanceQuerySchema.parse({
      days: url.searchParams.get("days") ?? 30,
      fiscalYear:
        url.searchParams.get("fiscalYear") ?? new Date().getUTCFullYear(),
      scenario: url.searchParams.get("scenario") ?? "base",
    });

    const snapshot = await getExecutiveFinanceSummary(input);

    if (!snapshot) {
      throw new Error("Executive finance snapshot is unavailable.");
    }

    const metrics = snapshot.metrics;

    if (!metrics) {
      throw new Error("Executive finance metrics are unavailable.");
    }

    const rows: unknown[][] = [
      ["EXECUTIVE FINANCE DASHBOARD"],
      ["Metric", "Value"],
      ...Object.entries(metrics),
      [],
      ["ALERTS"],
      ["Severity", "Title", "Message", "Value"],
      ...(snapshot.alerts ?? []).map((item) => [
        item.severity,
        item.title,
        item.message,
        item.value,
      ]),
      [],
      ["TREND"],
      ["Date", "Revenue", "Expenses", "Profit"],
      ...(snapshot.trend ?? []).map((item) => [
        item.date,
        item.revenue,
        item.expenses,
        item.profit,
      ]),
    ];

    const csv = rows.map((row) => row.map(cell).join(",")).join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="executive-finance-${input.days}-days-${input.scenario}.csv"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
