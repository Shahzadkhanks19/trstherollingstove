import { requirePermission } from "@/lib/auth/session";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { getRevenueSummary } from "@/services/revenue-management.service";
import { revenueRangeSchema } from "@/validators/revenue-management";

const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export async function GET(request: Request) {
  try {
    await requirePermission("reports.read");

    const url = new URL(request.url);
    const { days } = revenueRangeSchema.parse({
      days: url.searchParams.get("days") ?? 30,
    });

    const snapshot = await getRevenueSummary(days);
    const metrics = snapshot.metrics;

    if (!metrics) {
      throw new AppError("Revenue metrics are unavailable for the selected period.", 500);
    }

    const rows = [
      ["Metric", "Value"],
      ["Period start", snapshot.periodStart],
      ["Period end", snapshot.periodEnd],
      ["Paid orders", metrics.paidOrderCount],
      ["Completed orders", metrics.completedOrderCount],
      ["Gross revenue", metrics.grossRevenue],
      ["Recognized revenue", metrics.recognizedRevenue],
      ["Tax collected", metrics.taxCollected],
      ["Discounts", metrics.discountTotal],
      ["Refunds", metrics.refundTotal],
      ["Average order value", metrics.averageOrderValue],
      [],
      ["Day", "Orders", "Gross revenue", "Recognized revenue", "Tax", "Discounts", "Refunds"],
      ...snapshot.byDay.map((row) => [
        row.key,
        row.orders,
        row.grossRevenue,
        row.netRevenue,
        row.tax,
        row.discounts,
        row.refunds,
      ]),
    ];

    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="trs-revenue-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
