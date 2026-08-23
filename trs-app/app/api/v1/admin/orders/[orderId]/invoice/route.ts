import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { invoiceHtmlResponse } from "@/lib/invoices/response";
import { renderThermalInvoiceHtml } from "@/lib/invoices/receipt-html";
import { getOrCreateInvoice } from "@/services/invoice.service";

type Context = {
  params: Promise<{ orderId: string }>;
};

export async function GET(
  request: Request,
  context: Context,
) {
  try {
    const actor = await requirePermission(
      "orders.read",
    );
    const { orderId } = await context.params;

    await connectToDatabase();

    const invoice = await getOrCreateInvoice(
      orderId,
      actor.id,
    );

    const url = new URL(request.url);
    const format =
      url.searchParams.get("format") ?? "html";
    const download =
      url.searchParams.get("download") === "true";
    const paper =
      url.searchParams.get("paper") ?? "a4";
    const showInvoiceQr =
      url.searchParams.get("qr") === "true";

    if (format === "json") {
      return successResponse(invoice);
    }

    if (paper === "58mm" || paper === "80mm") {
      const copies = Math.min(
        3,
        Math.max(
          1,
          Number(url.searchParams.get("copies") ?? 1),
        ),
      );

      if (
        showInvoiceQr &&
        !invoice.verificationPublicId
      ) {
        invoice.verificationPublicId =
          (await import("@/lib/invoices/verification"))
            .createInvoicePublicId();
        invoice.verificationEnabled = true;
        invoice.verificationVersion = 1;
        await invoice.save();
      }

      return new Response(
        renderThermalInvoiceHtml(invoice.toObject(), {
          paper,
          copies,
          showTaxBreakup:
            url.searchParams.get("taxBreakup") !== "false",
          showInvoiceQr,
        }),
        {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
          },
        },
      );
    }

    if (
      showInvoiceQr &&
      !invoice.verificationPublicId
    ) {
      invoice.verificationPublicId =
        (await import("@/lib/invoices/verification"))
          .createInvoicePublicId();
      invoice.verificationEnabled = true;
      invoice.verificationVersion = 1;
      await invoice.save();
    }

    return invoiceHtmlResponse(
      invoice.toObject(),
      download,
      { showVerificationQr: showInvoiceQr },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
