import { requirePermission } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors/handleApiError";
import { getFinancialReportSummary } from "@/services/financial-reports.service";
import { financialReportRangeSchema } from "@/validators/financial-reports";

const cell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
export async function GET(request: Request) {
  try {
    await requirePermission("reports.read");
    const url = new URL(request.url);
    const { days } = financialReportRangeSchema.parse({ days: url.searchParams.get("days") ?? 30 });
    const snapshot = await getFinancialReportSummary(days);
    const sections = [
      ["PROFIT AND LOSS"], ["Account", "Amount", "Debit", "Credit"], ...snapshot.profitAndLoss.map((item) => [item.label, item.amount, item.debit, item.credit]), [],
      ["CASH FLOW"], ["Account", "Amount", "Debit", "Credit"], ...snapshot.cashFlow.map((item) => [item.label, item.amount, item.debit, item.credit]), [],
      ["BALANCE SHEET"], ["Account", "Amount", "Debit", "Credit"], ...snapshot.balanceSheet.map((item) => [item.label, item.amount, item.debit, item.credit]), [],
      ["TRIAL BALANCE"], ["Account", "Amount", "Debit", "Credit"], ...snapshot.trialBalance.map((item) => [item.label, item.amount, item.debit, item.credit]), [],
      ["GST SUMMARY"], ["Account", "Amount", "Debit", "Credit"], ...snapshot.gstSummary.map((item) => [item.label, item.amount, item.debit, item.credit]),
    ];
    const csv = sections.map((row) => row.map(cell).join(",")).join("\n");
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="financial-reports-${days}-days.csv"` } });
  } catch (error) { return handleApiError(error); }
}
