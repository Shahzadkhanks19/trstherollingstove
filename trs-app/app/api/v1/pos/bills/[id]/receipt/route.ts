import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { invoiceHtmlResponse } from "@/lib/invoices/response";
import {
  renderCompactReceiptHtml,
  renderThermalInvoiceHtml,
} from "@/lib/invoices/receipt-html";
import { markInvoicePrinted } from "@/services/pos-order.service";
import { ensureInvoiceVerificationIdentity } from "@/services/invoice-verification.service";
import { receiptQuerySchema } from "@/validators/pos-hardening";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("pos.use");
    const { id } = await context.params;
    const query = receiptQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    await connectToDatabase();
    await markInvoicePrinted(id, actor.id);
    const showInvoiceQr = query.qr === "true";
    const invoice = showInvoiceQr
      ? await ensureInvoiceVerificationIdentity(id)
      : await import("@/models/Invoice").then(({ Invoice }) =>
          Invoice.findById(id),
        );

    if (!invoice) {
      throw new Error("Invoice not found.");
    }

    if (query.format === "a4") {
      return invoiceHtmlResponse(
        invoice.toObject(),
        query.download === "true",
        { showVerificationQr: showInvoiceQr },
      );
    }

    const html =
      query.format === "thermal"
        ? renderThermalInvoiceHtml(invoice.toObject(), {
            showInvoiceQr,
          })
        : renderCompactReceiptHtml(
            invoice.toObject(),
            query.format,
          );
    const safeNumber = invoice.invoiceNumber.replace(/[^A-Za-z0-9_-]/g, "_");
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `${query.download === "true" ? "attachment" : "inline"}; filename="${safeNumber}-${query.format}.html"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
