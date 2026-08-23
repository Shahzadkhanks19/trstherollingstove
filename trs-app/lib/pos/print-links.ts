import { readPosPrintSettings } from "@/lib/pos/print-settings";

function booleanParam(value: boolean) {
  return value ? "true" : "false";
}

export function buildInvoicePrintUrl(invoiceId: string) {
  const settings = readPosPrintSettings();
  const params = new URLSearchParams({
    paper: settings.invoicePaper,
    copies: String(settings.invoiceCopies),
    taxBreakup: booleanParam(settings.showTaxBreakup),
    qr: booleanParam(settings.showInvoiceQr),
  });

  return `/api/v1/pos/bills/${encodeURIComponent(invoiceId)}/print?${params.toString()}`;
}

export function buildOrderInvoicePrintUrl(orderId: string) {
  const settings = readPosPrintSettings();
  const params = new URLSearchParams({
    paper: settings.invoicePaper,
    copies: String(settings.invoiceCopies),
    taxBreakup: booleanParam(settings.showTaxBreakup),
    qr: booleanParam(settings.showInvoiceQr),
  });

  return `/api/v1/admin/orders/${encodeURIComponent(orderId)}/invoice?${params.toString()}`;
}

export function buildKotPrintUrl(invoiceId: string) {
  const settings = readPosPrintSettings();
  const params = new URLSearchParams({
    paper: settings.kotPaper,
    copies: String(settings.kotCopies),
    customer: booleanParam(settings.showCustomerOnKot),
    prices: booleanParam(settings.showPricesOnKot),
  });

  return `/api/v1/pos/bills/${encodeURIComponent(invoiceId)}/kot?${params.toString()}`;
}
