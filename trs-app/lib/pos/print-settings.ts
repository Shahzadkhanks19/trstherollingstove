export type ThermalPaper = "58mm" | "80mm";
export type InvoicePaper = ThermalPaper | "a4";

export type PosPrintSettings = {
  kotPaper: ThermalPaper;
  invoicePaper: InvoicePaper;
  autoPrintKot: boolean;
  autoPrintInvoice: boolean;
  kotCopies: number;
  invoiceCopies: number;
  showCustomerOnKot: boolean;
  showPricesOnKot: boolean;
  showTaxBreakup: boolean;
  showInvoiceQr: boolean;
};

export const POS_PRINT_SETTINGS_KEY = "trs-pos-print-settings-v1";

export const DEFAULT_POS_PRINT_SETTINGS: PosPrintSettings = {
  kotPaper: "80mm",
  invoicePaper: "a4",
  autoPrintKot: true,
  autoPrintInvoice: true,
  kotCopies: 1,
  invoiceCopies: 1,
  showCustomerOnKot: false,
  showPricesOnKot: false,
  showTaxBreakup: true,
  showInvoiceQr: false,
};

export function readPosPrintSettings(): PosPrintSettings {
  if (typeof window === "undefined") return DEFAULT_POS_PRINT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(POS_PRINT_SETTINGS_KEY);
    if (!raw) return DEFAULT_POS_PRINT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<PosPrintSettings>;
    return {
      ...DEFAULT_POS_PRINT_SETTINGS,
      ...parsed,
      kotCopies: Math.min(3, Math.max(1, Number(parsed.kotCopies ?? 1))),
      invoiceCopies: Math.min(3, Math.max(1, Number(parsed.invoiceCopies ?? 1))),
    };
  } catch {
    return DEFAULT_POS_PRINT_SETTINGS;
  }
}

export function savePosPrintSettings(settings: PosPrintSettings) {
  window.localStorage.setItem(POS_PRINT_SETTINGS_KEY, JSON.stringify(settings));
}
