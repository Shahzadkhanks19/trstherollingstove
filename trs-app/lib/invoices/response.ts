import {
  renderInvoiceHtml,
  type InvoiceRenderOptions,
} from "@/lib/invoices/html";

type InvoiceLike = Parameters<
  typeof renderInvoiceHtml
>[0];

export function invoiceHtmlResponse(
  invoice: InvoiceLike,
  download: boolean,
  options: InvoiceRenderOptions = {},
) {
  const html = renderInvoiceHtml(invoice, options);
  const safeNumber = invoice.invoiceNumber.replace(
    /[^A-Za-z0-9_-]/g,
    "_",
  );

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type":
        "text/html; charset=utf-8",
      "Content-Disposition": `${
        download ? "attachment" : "inline"
      }; filename="${safeNumber}.html"`,
      "Cache-Control":
        "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
