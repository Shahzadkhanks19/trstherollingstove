import {
  escapeInvoiceHtml,
  formatInvoiceMoney,
} from "@/lib/invoices/format";
import { invoiceQrImageUrl } from "@/lib/invoices/verification";
import {
  TRS_INSTAGRAM_QR_IMAGE_URL,
  TRS_INSTAGRAM_USERNAME,
  TRS_REVIEWS_QR_IMAGE_URL,
  TRS_CONTACT_NUMBER,
} from "@/lib/social/instagram";

type InvoiceView = {
  verificationPublicId?: string | null;
  verificationEnabled?: boolean;
  invoiceNumber: string;
  orderNumber: string;
  issuedAt: Date | string;
  businessSnapshot?: {
    legalName?: string;
    tradeName?: string;
    phone?: string;
    email?: string;
    gstin?: string;
    address?: string;
  } | null;
  customerSnapshot?: {
    name?: string;
    phone?: string;
    email?: string;
  } | null;
  orderMode: "dine_in" | "takeaway";
  tableNumber?: string;
  saleType?: "customer" | "staff_meal" | "family_meal" | "complimentary" | "food_wastage" | "kitchen_test";
  internalConsumption?: { personName?: string; reason?: string; notes?: string; menuValue?: number; approvalStatus?: string; approvalReason?: string } | null;
  paymentMethod?: string;
  paymentStatus?: string;
  paymentBreakdown?: Array<{
    method: "cash" | "upi" | "card" | "online";
    amount: number;
  }>;
  upiReference?: string;
  amountTendered?: number;
  changeDue?: number;
  items: Array<{
    name: string;
    variantName?: string;
    specialInstructions?: string;
    modifiers?: Array<{
      groupName?: string;
      optionName?: string;
      unitPrice?: number;
    }>;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  packingCharge?: number;
  serviceCharge?: number;
  additionalCharge?: number;
  additionalChargeLabel?: string;
  taxRate?: number;
  taxMode?: "exclusive" | "inclusive";
  discountReason?: string;
  grandTotal: number;
  currency?: string;
};

const INVOICE_LOGO_PATH = "/images/trs-logo.png";

function renderItemDetails(
  item: InvoiceView["items"][number],
) {
  const details: string[] = [];

  if (item.variantName) {
    details.push(
      escapeInvoiceHtml(item.variantName),
    );
  }

  for (const modifier of item.modifiers ?? []) {
    const label = [
      modifier.groupName,
      modifier.optionName,
    ]
      .filter(Boolean)
      .join(": ");

    if (label) {
      details.push(
        escapeInvoiceHtml(label),
      );
    }
  }

  const instruction = item.specialInstructions?.trim();

  if (details.length === 0 && !instruction) {
    return "";
  }

  return `
    ${details.length ? `<div class="item-details">${details.join(" · ")}</div>` : ""}
    ${instruction ? `<div class="item-instructions"><strong>Special instructions:</strong> ${escapeInvoiceHtml(instruction)}</div>` : ""}
  `;
}

function renderContactLine(
  label: string,
  value: string | undefined,
) {
  if (!value) {
    return "";
  }

  return `
    <p>
      <span>${escapeInvoiceHtml(label)}</span>
      <strong>${escapeInvoiceHtml(value)}</strong>
    </p>
  `;
}


function formatPaymentMethod(method: string) {
  const labels: Record<string, string> = {
    cash: "Cash",
    upi: "UPI",
    card: "Card",
    online: "Online",
  };

  return labels[method] ?? method.replaceAll("_", " ");
}

function getPaymentDisplay(invoice: InvoiceView) {
  const validParts = (invoice.paymentBreakdown ?? []).filter(
    (part) => Number(part.amount) > 0,
  );

  if (validParts.length > 0) {
    return [...new Set(validParts.map((part) => formatPaymentMethod(part.method)))].join(" + ");
  }

  if (invoice.paymentMethod === "split") {
    return "Cash + UPI";
  }

  return invoice.paymentMethod
    ? formatPaymentMethod(invoice.paymentMethod)
    : "Not specified";
}

function renderPaymentBreakdown(invoice: InvoiceView, currency: string) {
  const validParts = (invoice.paymentBreakdown ?? []).filter(
    (part) => Number(part.amount) > 0,
  );

  if (validParts.length <= 1) {
    return "";
  }

  return validParts
    .map(
      (part) => `<div class="totals-row"><span>${escapeInvoiceHtml(
        formatPaymentMethod(part.method),
      )}</span><strong>${escapeInvoiceHtml(
        formatInvoiceMoney(part.amount, currency),
      )}</strong></div>`,
    )
    .join("");
}

export type InvoiceRenderOptions = {
  showVerificationQr?: boolean;
};

export function renderInvoiceHtml(
  invoice: InvoiceView,
  options: InvoiceRenderOptions = {},
) {
  const currency = invoice.currency ?? "INR";
  const businessSnapshot =
    invoice.businessSnapshot ?? {};
  const customerSnapshot =
    invoice.customerSnapshot ?? {};

  const businessName =
    businessSnapshot.tradeName ||
    businessSnapshot.legalName ||
    "The Rolling Stove";
  const contactNumber =
    businessSnapshot.phone?.trim() ||
    `+91 ${TRS_CONTACT_NUMBER.slice(0, 5)} ${TRS_CONTACT_NUMBER.slice(5)}`;

  const customerName =
    customerSnapshot.name || "Customer";

  const orderMode =
    invoice.orderMode === "dine_in"
      ? "Dine-in"
      : "Takeaway";

  const itemRows = invoice.items
    .map(
      (item, index) => `
        <tr class="${index % 2 === 0 ? "row-even" : "row-odd"}">
          <td class="item-cell">
            <div class="item-name">
              ${escapeInvoiceHtml(item.name)}
            </div>
            ${renderItemDetails(item)}
          </td>

          <td class="number">
            ${escapeInvoiceHtml(item.quantity)}
          </td>

          <td class="number">
            ${escapeInvoiceHtml(
              formatInvoiceMoney(
                item.unitPrice,
                currency,
              ),
            )}
          </td>

          <td class="number item-total">
            ${escapeInvoiceHtml(
              formatInvoiceMoney(
                item.lineTotal,
                currency,
              ),
            )}
          </td>
        </tr>
      `,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  />

  <title>
    Invoice ${escapeInvoiceHtml(invoice.invoiceNumber)}
  </title>

  <style>
    :root {
      --trs-red: #c70d12;
      --trs-red-dark: #9f080d;
      --trs-orange: #ff4a1f;
      --trs-gold: #c8aa5b;
      --trs-gold-light: #f4ead0;
      --trs-dark: #343d4d;
      --trs-dark-soft: #505a69;
      --trs-white: #ffffff;
      --trs-background: #f8f5ef;
      --trs-border: #e7dcc1;
      --trs-text: #1f2329;
      --trs-muted: #6c727d;
      --trs-success: #18854b;
      --trs-shadow:
        0 24px 70px rgba(52, 61, 77, 0.14);

      font-family:
        Inter,
        Poppins,
        ui-sans-serif,
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;

      color: var(--trs-text);
      background: var(--trs-background);
    }

    * {
      box-sizing: border-box;
    }

    html {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      margin: 0;
      padding: 32px 20px;
      background:
        radial-gradient(
          circle at top left,
          rgba(200, 170, 91, 0.16),
          transparent 28%
        ),
        linear-gradient(
          135deg,
          #fffdf8 0%,
          var(--trs-background) 100%
        );
    }

    button {
      font: inherit;
    }

    .toolbar {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      width: min(960px, 100%);
      margin: 0 auto 18px;
    }

    .toolbar-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 9px;
      min-height: 44px;
      border-radius: 12px;
      padding: 11px 18px;
      font-weight: 800;
      cursor: pointer;
      transition:
        transform 160ms ease,
        background 160ms ease,
        border-color 160ms ease;
    }

    .toolbar-button:hover {
      transform: translateY(-1px);
    }

    .toolbar-button-primary {
      border: 1px solid var(--trs-red);
      color: var(--trs-white);
      background: var(--trs-red);
    }

    .toolbar-button-primary:hover {
      background: var(--trs-red-dark);
      border-color: var(--trs-red-dark);
    }

    .toolbar-button-secondary {
      border: 1px solid var(--trs-dark);
      color: var(--trs-dark);
      background: var(--trs-white);
    }

    .toolbar-button-secondary:hover {
      color: var(--trs-red);
      border-color: var(--trs-red);
    }

    .invoice-shell {
      position: relative;
      overflow: hidden;
      width: min(960px, 100%);
      margin: 0 auto;
      background: var(--trs-white);
      border: 1px solid var(--trs-border);
      border-radius: 24px;
      box-shadow: var(--trs-shadow);
    }

    .invoice-shell::before {
      content: "";
      position: absolute;
      inset: 0 0 auto 0;
      height: 8px;
      background:
        linear-gradient(
          90deg,
          var(--trs-red) 0 45%,
          var(--trs-gold) 45% 67%,
          var(--trs-orange) 67% 100%
        );
    }

    .invoice-content {
      padding: 42px;
    }

    .invoice-header {
      display: grid;
      grid-template-columns:
        minmax(0, 1.25fr)
        minmax(280px, 0.75fr);
      gap: 32px;
      align-items: start;
      padding-bottom: 30px;
      border-bottom: 2px solid var(--trs-gold);
    }

    .brand-block {
      display: flex;
      align-items: center;
      gap: 22px;
      min-width: 0;
    }

    .logo-frame {
      flex: 0 0 auto;
      width: 116px;
      height: 116px;
      padding: 7px;
      border: 2px solid var(--trs-gold);
      border-radius: 50%;
      background: var(--trs-white);
      box-shadow:
        0 12px 30px rgba(52, 61, 77, 0.12);
    }

    .logo-frame img {
      display: block;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
    }

    .brand-copy {
      min-width: 0;
    }

    .eyebrow {
      margin: 0 0 7px;
      color: var(--trs-red);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }

    .brand-name {
      margin: 0;
      color: var(--trs-dark);
      font-size: clamp(26px, 4vw, 40px);
      font-weight: 900;
      letter-spacing: -0.045em;
      line-height: 1;
    }

    .brand-tagline {
      margin: 10px 0 0;
      color: var(--trs-muted);
      font-size: 14px;
      line-height: 1.6;
    }

    .business-contact {
      display: grid;
      gap: 4px;
      margin-top: 14px;
      color: var(--trs-muted);
      font-size: 12px;
      line-height: 1.55;
    }

    .invoice-title-card {
      padding: 24px;
      border: 1px solid var(--trs-border);
      border-radius: 18px;
      background:
        linear-gradient(
          145deg,
          var(--trs-dark) 0%,
          #27303f 100%
        );
      color: var(--trs-white);
      box-shadow:
        inset 0 1px rgba(255, 255, 255, 0.08);
    }

    .invoice-title-card h1 {
      margin: 0 0 20px;
      color: var(--trs-white);
      font-size: 28px;
      letter-spacing: -0.035em;
    }

    .invoice-title-card dl {
      display: grid;
      gap: 11px;
      margin: 0;
    }

    .invoice-title-card dl > div {
      display: grid;
      grid-template-columns: 92px minmax(0, 1fr);
      gap: 12px;
      align-items: start;
    }

    .invoice-title-card dt {
      color: rgba(255, 255, 255, 0.65);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
    }

    .invoice-title-card dd {
      margin: 0;
      color: var(--trs-white);
      font-size: 13px;
      font-weight: 800;
      text-align: right;
      overflow-wrap: anywhere;
    }

    .details-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 20px;
      margin: 28px 0;
    }

    .detail-card {
      position: relative;
      overflow: hidden;
      min-height: 170px;
      padding: 23px;
      border: 1px solid var(--trs-border);
      border-radius: 18px;
      background:
        linear-gradient(
          180deg,
          #ffffff 0%,
          #fffdf9 100%
        );
    }

    .detail-card::before {
      content: "";
      position: absolute;
      inset: 0 auto 0 0;
      width: 5px;
      background: var(--trs-gold);
    }

    .detail-card h2 {
      margin: 0 0 17px;
      color: var(--trs-red);
      font-size: 14px;
      font-weight: 900;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .detail-card p {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      margin: 0;
      padding: 7px 0;
      border-bottom:
        1px dashed rgba(200, 170, 91, 0.38);
      color: var(--trs-muted);
      font-size: 13px;
    }

    .detail-card p:last-child {
      border-bottom: 0;
    }

    .detail-card p span {
      flex: 0 0 auto;
    }

    .detail-card p strong {
      color: var(--trs-dark);
      text-align: right;
      overflow-wrap: anywhere;
    }

    .status-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 28px;
      padding: 5px 10px;
      border-radius: 999px;
      color: var(--trs-success);
      background: rgba(24, 133, 75, 0.1);
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .table-wrap {
      overflow: hidden;
      border: 1px solid var(--trs-border);
      border-radius: 18px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th,
    td {
      padding: 16px 15px;
      text-align: left;
      vertical-align: top;
    }

    thead {
      color: var(--trs-white);
      background: var(--trs-dark);
    }

    th {
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.09em;
      text-transform: uppercase;
    }

    tbody tr + tr {
      border-top: 1px solid var(--trs-border);
    }

    .row-even {
      background: var(--trs-white);
    }

    .row-odd {
      background: #fffcf6;
    }

    .item-name {
      color: var(--trs-dark);
      font-size: 14px;
      font-weight: 900;
    }

    .item-details {
      margin-top: 5px;
      color: var(--trs-muted);
      font-size: 11px;
      line-height: 1.5;
    }

    .item-instructions {
      margin-top: 7px;
      padding: 6px 8px;
      border-left: 3px solid var(--trs-red);
      border-radius: 4px;
      color: var(--trs-red-dark);
      background: rgba(199, 13, 18, 0.055);
      font-size: 10px;
      line-height: 1.45;
    }

    .number {
      text-align: right;
      white-space: nowrap;
    }

    .item-total {
      color: var(--trs-red);
      font-weight: 900;
    }

    .summary-section {
      display: grid;
      grid-template-columns:
        minmax(0, 1fr)
        minmax(320px, 390px);
      gap: 30px;
      align-items: end;
      margin-top: 28px;
    }

    .thank-you-note {
      align-self: stretch;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 24px;
      border: 1px solid var(--trs-border);
      border-radius: 18px;
      background: var(--trs-gold-light);
    }

    .thank-you-note strong {
      color: var(--trs-red);
      font-size: 19px;
    }

    .thank-you-note p {
      margin: 8px 0 0;
      color: var(--trs-dark-soft);
      font-size: 13px;
      line-height: 1.65;
    }

    .totals-card {
      overflow: hidden;
      border: 1px solid var(--trs-border);
      border-radius: 18px;
      background: var(--trs-white);
    }

    .totals-body {
      padding: 20px 22px;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      padding: 9px 0;
      color: var(--trs-muted);
      font-size: 14px;
    }

    .totals-row strong {
      color: var(--trs-dark);
    }

    .grand-total {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      padding: 18px 22px;
      color: var(--trs-white);
      background:
        linear-gradient(
          135deg,
          var(--trs-red) 0%,
          var(--trs-red-dark) 100%
        );
      font-size: 20px;
      font-weight: 900;
    }

    .invoice-verification-card {
      display: grid; grid-template-columns: 104px minmax(0,1fr); gap: 16px; align-items: center;
      margin-top: 26px; padding: 15px; border: 1px solid var(--trs-border); border-left: 4px solid var(--trs-gold);
      border-radius: 16px; background: linear-gradient(145deg,#fff,#fffdf8); break-inside: avoid; page-break-inside: avoid;
    }
    .invoice-verification-card img { width:100px; height:100px; padding:4px; border:1px solid var(--trs-border); border-radius:12px; background:#fff; }
    .invoice-verification-card h2 { margin:0 0 6px; color:var(--trs-dark); font-size:14px; font-weight:900; text-transform:uppercase; }
    .invoice-verification-card p { margin:0; color:var(--trs-muted); font-size:11px; line-height:1.5; }
    .invoice-social-title { margin:22px 0 10px; color:var(--trs-dark); font-size:12px; font-weight:900; letter-spacing:.14em; text-align:center; text-transform:uppercase; }
    .invoice-social-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; break-inside:avoid; page-break-inside:avoid; }
    .invoice-social-card { min-width:0; padding:10px 7px; border:1px solid var(--trs-border); border-radius:14px; background:#fffdf8; text-align:center; }
    .invoice-social-card img { display:block; width:100px; height:100px; margin:0 auto 6px; padding:4px; border:1px solid var(--trs-border); border-radius:12px; background:#fff; object-fit:contain; }
    .invoice-social-card strong { display:block; color:var(--trs-dark); font-size:10px; text-transform:uppercase; }
    .invoice-social-card span { display:block; margin-top:3px; color:var(--trs-muted); font-size:9px; line-height:1.25; overflow-wrap:anywhere; }
    .invoice-social-card.instagram { border-color:#e6a3c7; } .invoice-social-card.reviews { border-color:#efd070; }
    .invoice-footer { display:grid; grid-template-columns:58px minmax(0,1fr) auto; gap:14px; align-items:center; margin-top:26px; padding-top:20px; border-top:1px solid var(--trs-border); break-inside:avoid; page-break-inside:avoid; }
    .footer-logo { width:58px; height:58px; border-radius:50%; object-fit:cover; border:2px solid var(--trs-gold); }
    .footer-copy strong { display:block; color:var(--trs-dark); font-size:14px; }
    .footer-copy span { display:block; margin-top:4px; color:var(--trs-muted); font-size:10px; }
    .footer-thanks { text-align:right; color:var(--trs-red); }
    .footer-thanks strong { display:block; font-family:"Brush Script MT","Segoe Script","URW Chancery L",cursive; font-size:34px; line-height:.95; font-weight:500; }
    .footer-thanks span { display:block; margin-top:5px; color:var(--trs-dark); font-size:10px; font-weight:900; letter-spacing:.22em; text-transform:uppercase; }

    @media (max-width: 760px) {
      body {
        padding: 0;
        background: var(--trs-white);
      }

      .toolbar {
        position: sticky;
        top: 0;
        z-index: 10;
        margin: 0;
        padding: 12px;
        background: rgba(255, 255, 255, 0.96);
        box-shadow:
          0 8px 24px rgba(52, 61, 77, 0.08);
      }

      .toolbar-button {
        flex: 1;
        padding-inline: 12px;
        font-size: 12px;
      }

      .invoice-shell {
        border: 0;
        border-radius: 0;
        box-shadow: none;
      }

      .invoice-content {
        padding: 28px 18px;
      }

      .invoice-header {
        grid-template-columns: 1fr;
        gap: 24px;
      }

      .brand-block {
        align-items: flex-start;
      }

      .logo-frame {
        width: 88px;
        height: 88px;
      }

      .details-grid,
      .summary-section {
        grid-template-columns: 1fr;
      }

      .invoice-title-card dl > div {
        grid-template-columns: 100px minmax(0, 1fr);
      }

      .table-wrap {
        overflow-x: auto;
      }

      table {
        min-width: 620px;
      }
    }

    @media print {
      @page {
        size: A4 portrait;
        margin: 0;
      }

      html,
      body {
        width: auto !important;
        height: auto !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
      }

      body {
        padding: 7mm 9mm !important;
      }

      .toolbar {
        display: none !important;
      }

      .invoice-shell {
        position: static !important;
        overflow: visible !important;
        width: 100% !important;
        height: auto !important;
        min-height: 0 !important;
        margin: 0 !important;
        border: 0 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
      }

      .invoice-shell::before {
        height: 2.2mm;
      }

      .invoice-content {
        padding: 5mm 0 0 !important;
      }

      /* Explicitly override the mobile rules that also match Chrome's
         printable viewport. */
      .invoice-header {
        display: grid !important;
        grid-template-columns: minmax(0, 1.15fr) minmax(58mm, 0.85fr) !important;
        gap: 5mm !important;
        align-items: start !important;
        padding-bottom: 4mm !important;
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .brand-block {
        align-items: center !important;
        gap: 4mm !important;
      }

      .logo-frame {
        width: 23mm !important;
        height: 23mm !important;
        padding: 1mm !important;
        box-shadow: none !important;
      }

      .eyebrow {
        margin-bottom: 1mm !important;
        font-size: 7.5px !important;
      }

      .brand-name {
        font-size: 21px !important;
      }

      .brand-tagline {
        margin-top: 1.2mm !important;
        font-size: 9px !important;
        line-height: 1.3 !important;
      }

      .business-contact {
        gap: 0 !important;
        margin-top: 1.5mm !important;
        font-size: 7.5px !important;
        line-height: 1.3 !important;
      }

      .invoice-title-card {
        padding: 3.8mm !important;
        border-radius: 3mm !important;
        box-shadow: none !important;
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .invoice-title-card h1 {
        margin-bottom: 2.5mm !important;
        font-size: 17px !important;
      }

      .invoice-title-card dl {
        gap: 1.2mm !important;
      }

      .invoice-title-card dl > div {
        grid-template-columns: 18mm minmax(0, 1fr) !important;
        gap: 1.5mm !important;
      }

      .invoice-title-card dt {
        font-size: 7px !important;
      }

      .invoice-title-card dd {
        font-size: 8px !important;
      }

      .details-grid {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        gap: 3mm !important;
        margin: 3.5mm 0 !important;
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .detail-card {
        min-height: 0 !important;
        padding: 3mm 4mm !important;
        border-radius: 3mm !important;
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .detail-card h2 {
        margin-bottom: 1.5mm !important;
        font-size: 8px !important;
      }

      .detail-card p {
        padding: 0.7mm 0 !important;
        font-size: 7.8px !important;
      }

      .status-chip {
        min-height: 4mm !important;
        padding: 0.6mm 2mm !important;
        font-size: 6.5px !important;
      }

      .table-wrap {
        overflow: visible !important;
        border-radius: 3mm !important;
        break-inside: auto !important;
        page-break-inside: auto !important;
      }

      table {
        width: 100% !important;
        min-width: 0 !important;
        page-break-inside: auto !important;
      }

      thead {
        display: table-header-group;
      }

      tbody {
        display: table-row-group;
      }

      tr {
        break-inside: avoid;
        page-break-inside: avoid;
      }

      th,
      td {
        padding: 2mm 2.4mm !important;
      }

      th {
        font-size: 6.8px !important;
      }

      .item-name {
        font-size: 8.5px !important;
      }

      .item-details {
        margin-top: 0.6mm !important;
        font-size: 6.8px !important;
        line-height: 1.25 !important;
      }

      .summary-section {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) minmax(63mm, 75mm) !important;
        gap: 3mm !important;
        margin-top: 3.5mm !important;
        align-items: start !important;
        break-inside: auto !important;
        page-break-inside: auto !important;
      }

      .thank-you-note {
        padding: 3.5mm !important;
        border-radius: 3mm !important;
      }

      .thank-you-note strong {
        font-size: 11px !important;
      }

      .thank-you-note p {
        margin-top: 1mm !important;
        font-size: 7.5px !important;
        line-height: 1.3 !important;
      }

      .totals-card {
        border-radius: 3mm !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      .totals-body {
        padding: 2.3mm 3.5mm !important;
      }

      .totals-row {
        padding: 0.8mm 0 !important;
        font-size: 8px !important;
      }

      .grand-total {
        padding: 2.8mm 3.5mm !important;
        font-size: 12px !important;
      }

      .invoice-verification-card {
        display: grid !important;
        grid-template-columns: 24mm minmax(0, 1fr) !important;
        gap: 4mm !important;
        align-items: center !important;
        margin-top: 5mm !important;
        padding: 3mm !important;
        border-radius: 3mm !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      .invoice-verification-card img {
        width: 23mm !important;
        height: 23mm !important;
        padding: 0.8mm !important;
        border-radius: 2mm !important;
      }

      .invoice-verification-card h2 {
        margin-bottom: 1mm !important;
        font-size: 9px !important;
      }

      .invoice-verification-card p {
        font-size: 7px !important;
        line-height: 1.35 !important;
      }

      .invoice-social-title {
        margin: 4.5mm 0 2.5mm !important;
        font-size: 8px !important;
      }

      .invoice-social-grid {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        gap: 2.5mm !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      .invoice-social-card {
        min-width: 0 !important;
        padding: 2.5mm 1.8mm !important;
        border-radius: 3mm !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      .invoice-social-card img {
        width: 23mm !important;
        height: 23mm !important;
        margin-bottom: 1.5mm !important;
        padding: 0.8mm !important;
        border-radius: 2mm !important;
      }

      .invoice-social-card strong {
        font-size: 7px !important;
      }

      .invoice-social-card span {
        margin-top: 0.8mm !important;
        font-size: 6px !important;
        line-height: 1.25 !important;
      }

      .invoice-footer {
        display: grid !important;
        grid-template-columns: 11mm minmax(0, 1fr) auto !important;
        gap: 2.2mm !important;
        align-items: center !important;
        margin-top: 3mm !important;
        padding-top: 3mm !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      .thank-you-note,
      .totals-card {
        align-self: start !important;
      }

      .footer-logo {
        width: 11mm !important;
        height: 11mm !important;
      }

      .footer-copy strong {
        font-size: 9px !important;
      }

      .footer-copy span {
        margin-top: 0.5mm !important;
        font-size: 6.8px !important;
        line-height: 1.2 !important;
      }


      .footer-thanks {
        text-align: right !important;
        white-space: nowrap !important;
      }

      .footer-thanks strong {
        font-size: 22px !important;
        line-height: 0.95 !important;
      }

      .footer-thanks span {
        margin-top: 1mm !important;
        font-size: 7px !important;
        letter-spacing: 0.2em !important;
      }
    }

  </style>
</head>

<body>
  <div class="toolbar">
    <button
      type="button"
      class="toolbar-button toolbar-button-secondary"
      onclick="window.close()"
    >
      Close
    </button>

    <button
      type="button"
      class="toolbar-button toolbar-button-primary"
      onclick="window.print()"
    >
      Print / Save as PDF
    </button>
  </div>

  <main class="invoice-shell">
    <div class="invoice-content">
      <header class="invoice-header">
        <section class="brand-block">
          <div class="logo-frame">
            <img
              src="${INVOICE_LOGO_PATH}"
              alt="${escapeInvoiceHtml(businessName)} logo"
            />
          </div>

          <div class="brand-copy">
            <p class="eyebrow">Fresh • Hot • Delicious</p>

            <h2 class="brand-name">
              ${escapeInvoiceHtml(businessName)}
            </h2>

            <p class="brand-tagline">
              Premium vegetarian food, prepared with care.
            </p>

            <div class="business-contact">
              ${
                businessSnapshot.address
                  ? `<span>${escapeInvoiceHtml(
                      businessSnapshot.address,
                    )}</span>`
                  : ""
              }

              <span>Phone: ${escapeInvoiceHtml(contactNumber)}</span>

              ${
                businessSnapshot.email
                  ? `<span>Email: ${escapeInvoiceHtml(
                      businessSnapshot.email,
                    )}</span>`
                  : ""
              }

              ${
                businessSnapshot.gstin
                  ? `<span>GSTIN: ${escapeInvoiceHtml(
                      businessSnapshot.gstin,
                    )}</span>`
                  : ""
              }
            </div>
          </div>
        </section>

        <section class="invoice-title-card">
          <h1>Tax Invoice</h1>

          <dl>
            <div>
              <dt>Invoice</dt>
              <dd>
                ${escapeInvoiceHtml(
                  invoice.invoiceNumber,
                )}
              </dd>
            </div>

            <div>
              <dt>Order</dt>
              <dd>
                ${escapeInvoiceHtml(
                  invoice.orderNumber,
                )}
              </dd>
            </div>

            <div>
              <dt>Issued</dt>
              <dd>
                ${escapeInvoiceHtml(
                  new Date(
                    invoice.issuedAt,
                  ).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    dateStyle: "medium",
                    timeStyle: "short",
                  }),
                )}
              </dd>
            </div>
          </dl>
        </section>
      </header>

      <section class="details-grid">
        <article class="detail-card">
          <h2>Customer Details</h2>

          ${renderContactLine(
            "Name",
            customerName,
          )}

          ${renderContactLine(
            "Phone",
            customerSnapshot.phone,
          )}

          ${renderContactLine(
            "Email",
            customerSnapshot.email?.endsWith("@customer.trs.local")
              ? undefined
              : customerSnapshot.email,
          )}
        </article>

        <article class="detail-card">
          <h2>Order Details</h2>

          ${renderContactLine(
            "Order type",
            orderMode,
          )}

          ${renderContactLine(
            "Table",
            invoice.tableNumber,
          )}

          ${invoice.saleType && invoice.saleType !== "customer" ? `
            ${renderContactLine("Classification", invoice.saleType.replaceAll("_", " "))}
            ${renderContactLine("Person / recipient", invoice.internalConsumption?.personName)}
            ${renderContactLine("Internal reason", invoice.internalConsumption?.reason)}
            ${renderContactLine("Approval", invoice.internalConsumption?.approvalStatus)}
          ` : ""}

          ${renderContactLine(
            "Payment",
            invoice.saleType && invoice.saleType !== "customer"
              ? "Not required (internal consumption)"
              : getPaymentDisplay(invoice),
          )}

          <p>
            <span>Status</span>
            <strong>
              <span class="status-chip">
                ${escapeInvoiceHtml(
                  invoice.paymentStatus ||
                    "Not specified",
                )}
              </span>
            </strong>
          </p>
        </article>
      </section>

      <section class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th class="number">Qty</th>
              <th class="number">Unit Price</th>
              <th class="number">Total</th>
            </tr>
          </thead>

          <tbody>
            ${itemRows}
          </tbody>
        </table>
      </section>

      <section class="summary-section">
        <article class="thank-you-note">
          <strong>
            Thank you for dining with us.
          </strong>

          <p>
            Your support means a lot to
            ${escapeInvoiceHtml(businessName)}.
            We look forward to serving you again.
          </p>
        </article>

        <article class="totals-card">
          <div class="totals-body">
            <div class="totals-row">
              <span>Subtotal</span>
              <strong>
                ${escapeInvoiceHtml(
                  formatInvoiceMoney(
                    invoice.subtotal,
                    currency,
                  ),
                )}
              </strong>
            </div>

            ${invoice.packingCharge ? `<div class="totals-row"><span>Packing charge</span><strong>${escapeInvoiceHtml(formatInvoiceMoney(invoice.packingCharge, currency))}</strong></div>` : ""}
            ${invoice.serviceCharge ? `<div class="totals-row"><span>Service charge</span><strong>${escapeInvoiceHtml(formatInvoiceMoney(invoice.serviceCharge, currency))}</strong></div>` : ""}
            ${invoice.additionalCharge ? `<div class="totals-row"><span>${escapeInvoiceHtml(invoice.additionalChargeLabel || "Additional charge")}</span><strong>${escapeInvoiceHtml(formatInvoiceMoney(invoice.additionalCharge, currency))}</strong></div>` : ""}

            ${invoice.taxTotal > 0 ? `<div class="totals-row"><span>CGST</span><strong>${escapeInvoiceHtml(formatInvoiceMoney(invoice.taxTotal / 2, currency))}</strong></div><div class="totals-row"><span>SGST</span><strong>${escapeInvoiceHtml(formatInvoiceMoney(invoice.taxTotal / 2, currency))}</strong></div>` : ""}

            <div class="totals-row">
              <span>Discount</span>
              <strong>
                - ${escapeInvoiceHtml(
                  formatInvoiceMoney(
                    invoice.discountTotal,
                    currency,
                  ),
                )}
              </strong>
            </div>
          </div>

          <div class="grand-total">
            <span>Grand Total</span>

            <span>
              ${escapeInvoiceHtml(
                formatInvoiceMoney(
                  invoice.grandTotal,
                  currency,
                ),
              )}
            </span>
          </div>
          ${renderPaymentBreakdown(invoice, currency) ? `<div class="totals-body"><div class="totals-row"><span><strong>Payment breakup</strong></span><strong>${escapeInvoiceHtml(getPaymentDisplay(invoice))}</strong></div>${renderPaymentBreakdown(invoice, currency)}</div>` : ""}
          ${invoice.paymentMethod === "cash" ? `<div class="totals-body"><div class="totals-row"><span>Cash received</span><strong>${escapeInvoiceHtml(formatInvoiceMoney(invoice.amountTendered ?? invoice.grandTotal, currency))}</strong></div><div class="totals-row"><span>Change returned</span><strong>${escapeInvoiceHtml(formatInvoiceMoney(invoice.changeDue ?? 0, currency))}</strong></div></div>` : ""}
        </article>
      </section>

      ${options.showVerificationQr === true && invoice.verificationEnabled !== false && invoice.verificationPublicId ? `
      <section class="invoice-verification-card">
        <img src="${escapeInvoiceHtml(invoiceQrImageUrl({ publicId: invoice.verificationPublicId, invoiceNumber: invoice.invoiceNumber }))}" alt="Invoice verification QR code" />
        <div><h2>✓ Secure invoice verification</h2><p>Scan to confirm this invoice, its items, amount, payment status and authenticity on the official TRS website.</p></div>
      </section>` : ""}

      <h2 class="invoice-social-title">Connect with The Rolling Stove</h2>
      <section class="invoice-social-grid">
        <article class="invoice-social-card instagram"><img src="${TRS_INSTAGRAM_QR_IMAGE_URL}" alt="Instagram QR"/><strong>Instagram</strong><span>@${TRS_INSTAGRAM_USERNAME}</span></article>
        <article class="invoice-social-card reviews"><img src="${TRS_REVIEWS_QR_IMAGE_URL}" alt="Google review QR"/><strong>Review us</strong><span>Scan to leave a Google review</span></article>
      </section>

      <footer class="invoice-footer">
        <img class="footer-logo" src="${INVOICE_LOGO_PATH}" alt="" />
        <div class="footer-copy"><strong>${escapeInvoiceHtml(businessName)}</strong><span>Fresh • Hot • Delicious</span></div>
        <div class="footer-thanks"><strong>Thank You!</strong><span>Visit Again</span></div>
      </footer>
    </div>
  </main>
</body>
</html>`;
}
