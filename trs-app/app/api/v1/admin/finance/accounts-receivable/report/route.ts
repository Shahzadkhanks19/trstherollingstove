import { requirePermission } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors/handleApiError";
import { getAccountsReceivableSummary } from "@/services/accounts-receivable.service";
import { receivableRangeSchema } from "@/validators/accounts-receivable";

const escapeCsv = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export async function GET(request: Request) {
  try {
    await requirePermission("reports.read");
    const url = new URL(request.url);
    const { days } = receivableRangeSchema.parse({ days: url.searchParams.get("days") ?? 30 });
    const summary = await getAccountsReceivableSummary(days);
    const rows = [
      ["Invoice", "Customer", "Invoice date", "Due date", "Status", "Total", "Paid", "Outstanding"],
      ...summary.recentInvoices.map((invoice) => [
        invoice.invoiceNumber,
        invoice.customerName,
        new Date(invoice.invoiceDate).toISOString(),
        new Date(invoice.dueDate).toISOString(),
        invoice.status,
        invoice.totalAmount,
        invoice.paidAmount,
        invoice.outstandingAmount,
      ]),
    ];
    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="accounts-receivable-${days}-days.csv"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
