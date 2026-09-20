import type { PosPrintSettings } from "@/lib/pos/print-settings";

export function openPosSalePrintWindow(settings: PosPrintSettings) {
  return settings.autoPrintKot || settings.autoPrintInvoice
    ? window.open("about:blank", "_blank")
    : null;
}

export function routePosSalePrintJobs(
  invoiceId: string,
  settings: PosPrintSettings,
  printWindow: Window | null,
) {
  if (!printWindow) return;

  const kotParams = new URLSearchParams({
    paper: settings.kotPaper,
    copies: String(settings.kotCopies),
    customer: String(settings.showCustomerOnKot),
    prices: String(settings.showPricesOnKot),
  });
  const invoiceParams = new URLSearchParams({
    paper: settings.invoicePaper,
    copies: String(settings.invoiceCopies),
    taxBreakup: String(settings.showTaxBreakup),
    qr: String(settings.showInvoiceQr),
  });

  printWindow.opener = null;
  const invoicePrintUrl =
    `/api/v1/pos/bills/${invoiceId}/print?${invoiceParams.toString()}`;

  if (settings.autoPrintKot && settings.autoPrintInvoice) {
    kotParams.set("nextInvoice", "true");
    kotParams.set("invoicePaper", settings.invoicePaper);
    kotParams.set("invoiceCopies", String(settings.invoiceCopies));
    kotParams.set("invoiceTaxBreakup", String(settings.showTaxBreakup));
    kotParams.set("invoiceQr", String(settings.showInvoiceQr));
    printWindow.location.href =
      `/api/v1/pos/bills/${invoiceId}/kot?${kotParams.toString()}`;
  } else if (settings.autoPrintKot) {
    printWindow.location.href =
      `/api/v1/pos/bills/${invoiceId}/kot?${kotParams.toString()}`;
  } else {
    printWindow.location.href = invoicePrintUrl;
  }
}

export function reprintPosInvoice(
  invoiceId: string,
  settings: PosPrintSettings,
) {
  window.open(
    `/api/v1/pos/bills/${invoiceId}/print?paper=${settings.invoicePaper}&copies=${settings.invoiceCopies}&taxBreakup=${settings.showTaxBreakup}&qr=${settings.showInvoiceQr}`,
    "_blank",
    "noopener,noreferrer",
  );
}

export function reprintPosKot(invoiceId: string, settings: PosPrintSettings) {
  window.open(
    `/api/v1/pos/bills/${invoiceId}/kot?paper=${settings.kotPaper}&copies=${settings.kotCopies}&customer=${settings.showCustomerOnKot}&prices=${settings.showPricesOnKot}`,
    "_blank",
    "noopener,noreferrer",
  );
}
