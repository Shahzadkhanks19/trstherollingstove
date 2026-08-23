import { requirePermission } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors/handleApiError";
import { getPaymentManagementSummary } from "@/services/payment-management.service";
import { paymentManagementRangeSchema } from "@/validators/payment-management";

const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
export async function GET(request: Request) {
  try {
    await requirePermission("payments.read");
    const url = new URL(request.url);
    const { days } = paymentManagementRangeSchema.parse({ days: url.searchParams.get("days") ?? 30 });
    const summary = await getPaymentManagementSummary(days);
    const rows = [
      ["Payment ID", "Provider payment ID", "Provider", "Method", "Status", "Amount", "Refunded", "Currency", "Created at"],
      ...summary.recentPayments.map((payment) => [
        String(payment._id), payment.providerPaymentId, payment.provider, payment.method || "unknown",
        payment.status, payment.amount, payment.amountRefunded, payment.currency, new Date(payment.createdAt).toISOString(),
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="payment-management-${days}-days.csv"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
