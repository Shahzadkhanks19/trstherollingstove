import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { renderKotAndInvoiceHtml } from "@/lib/invoices/receipt-html";
import { markInvoicePrinted } from "@/services/pos-order.service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("pos.use");
    const { id } = await context.params;
    await connectToDatabase();
    const invoice = await markInvoicePrinted(id, actor.id);
    const html = renderKotAndInvoiceHtml(invoice.toObject());

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
