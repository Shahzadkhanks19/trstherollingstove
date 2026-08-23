import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { renderKotHtml, type ReceiptPaper } from "@/lib/invoices/receipt-html";
import { markInvoicePrinted } from "@/services/pos-order.service";
import { createPrintJob } from "@/services/print-audit.service";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("pos.use");
    const { id } = await context.params;
    await connectToDatabase();
    const invoice = await markInvoicePrinted(id, actor.id);
    const url = new URL(request.url);
    const paper = (url.searchParams.get("paper") === "58mm" ? "58mm" : "80mm") as ReceiptPaper;
    const copies = Math.min(3, Math.max(1, Number(url.searchParams.get("copies") ?? 1)));
    const nextPrintUrl =
      url.searchParams.get("nextInvoice") === "true"
        ? (() => {
            const nextParams = new URLSearchParams({
              paper: url.searchParams.get("invoicePaper") === "58mm"
                ? "58mm"
                : url.searchParams.get("invoicePaper") === "80mm"
                  ? "80mm"
                  : "a4",
              copies: String(
                Math.min(
                  3,
                  Math.max(1, Number(url.searchParams.get("invoiceCopies") ?? 1)),
                ),
              ),
              taxBreakup: String(url.searchParams.get("invoiceTaxBreakup") !== "false"),
              qr: String(url.searchParams.get("invoiceQr") === "true"),
            });
            return `/api/v1/pos/bills/${encodeURIComponent(id)}/print?${nextParams.toString()}`;
          })()
        : undefined;
    await createPrintJob({ documentType: "kot", entityType: "invoice", entityId: String(invoice._id), orderId: String(invoice.orderId), orderNumber: invoice.orderNumber, label: `Kitchen KOT ${invoice.orderNumber}`, printUrl: request.url, paper, copies, requestedBy: actor.id });
    const html = renderKotHtml(invoice.toObject(), {
      paper,
      copies,
      showCustomer: url.searchParams.get("customer") === "true",
      showPrices: url.searchParams.get("prices") === "true",
      nextPrintUrl,
    });

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
