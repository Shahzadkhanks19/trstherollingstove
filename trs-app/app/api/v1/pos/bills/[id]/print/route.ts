import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { invoiceHtmlResponse } from "@/lib/invoices/response";
import { renderThermalInvoiceHtml } from "@/lib/invoices/receipt-html";
import { markInvoicePrinted } from "@/services/pos-order.service";
import { ensureInvoiceVerificationIdentity } from "@/services/invoice-verification.service";

type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const actor = await requirePermission("pos.use");
    const { id } = await context.params;
    await connectToDatabase();
    await markInvoicePrinted(id, actor.id);
    const url = new URL(request.url);
    const showInvoiceQr =
      url.searchParams.get("qr") === "true";
    const invoice = showInvoiceQr
      ? await ensureInvoiceVerificationIdentity(id)
      : await import("@/models/Invoice").then(({ Invoice }) =>
          Invoice.findById(id),
        );

    if (!invoice) {
      throw new Error("Invoice not found.");
    }
    const download = url.searchParams.get("download") === "true";
    const paper = url.searchParams.get("paper") ?? "a4";
    if (paper === "58mm" || paper === "80mm") {
      const copies = Math.min(3, Math.max(1, Number(url.searchParams.get("copies") ?? 1)));
      return new Response(renderThermalInvoiceHtml(invoice.toObject(), {
        paper,
        copies,
        showTaxBreakup: url.searchParams.get("taxBreakup") !== "false",
        showInvoiceQr,
      }), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
    }
    return invoiceHtmlResponse(
      invoice.toObject(),
      download,
      { showVerificationQr: showInvoiceQr },
    );
  } catch (error) { return handleApiError(error); }
}
