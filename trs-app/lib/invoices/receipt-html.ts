import { escapeInvoiceHtml, formatInvoiceMoney } from "@/lib/invoices/format";
import { renderInvoiceHtml } from "@/lib/invoices/html";
import { invoiceQrImageUrl } from "@/lib/invoices/verification";
import {
  TRS_INSTAGRAM_QR_IMAGE_URL,
  TRS_INSTAGRAM_USERNAME,
  TRS_REVIEWS_QR_IMAGE_URL,
  TRS_CONTACT_NUMBER,
} from "@/lib/social/instagram";

const THERMAL_LOGO_PATH = "/images/trs-logo-thermal.png";

function formatReceiptDateTime(value: Date | string) {
  return new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export type ReceiptPaper = "58mm" | "80mm";
export type InvoicePaper = ReceiptPaper | "a4";

export type ReceiptInvoice = {
  verificationPublicId?: string | null;
  verificationEnabled?: boolean;
  invoiceNumber: string;
  orderNumber: string;
  kitchenToken?: string;
  issuedAt: Date | string;
  businessSnapshot?: { tradeName?: string; legalName?: string; phone?: string; gstin?: string; address?: string } | null;
  customerSnapshot?: { name?: string; phone?: string; email?: string } | null;
  orderMode: "dine_in" | "takeaway";
  tableNumber?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  paymentBreakdown?: Array<{
    method: "cash" | "upi" | "card" | "online";
    amount: number;
  }>;
  amountTendered?: number;
  changeDue?: number;
  items: Array<{
    name: string;
    variantName?: string;
    specialInstructions?: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    modifiers?: Array<{ groupName?: string; optionName?: string }>;
    kotAction?:
      | "initial"
      | "addition"
      | "modification"
      | "cancellation"
      | "instruction_update";
    previousQuantity?: number;
    newQuantity?: number;
    changeSummary?: string[];
  }>;
  kotRevision?: number;
  kotType?:
    | "initial"
    | "addition"
    | "modification"
    | "cancellation"
    | "instruction_update";
  kotOrderNote?: string;
  kotPreviousOrderNote?: string;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  packingCharge?: number;
  serviceCharge?: number;
  additionalCharge?: number;
  additionalChargeLabel?: string;
  grandTotal: number;
  currency?: string;
};

type KotOptions = {
  paper?: ReceiptPaper;
  copies?: number;
  showCustomer?: boolean;
  showPrices?: boolean;
  nextPrintUrl?: string;
};

type InvoiceOptions = {
  paper?: InvoicePaper;
  copies?: number;
  showTaxBreakup?: boolean;
  showInvoiceQr?: boolean;
};

function token(orderNumber: string, kitchenToken?: string) {
  const persistedToken = kitchenToken?.trim();

  if (persistedToken) {
    return persistedToken.startsWith("#")
      ? persistedToken
      : `#${persistedToken}`;
  }

  const sequence = orderNumber.match(/(?:^|[-_])(\d{1,6})$/)?.[1];

  return sequence
    ? `#${sequence.padStart(3, "0")}`
    : `#${orderNumber
        .replace(/[^A-Za-z0-9]/g, "")
        .slice(-4)
        .toUpperCase() || "---"}`;
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

function paymentParts(invoice: ReceiptInvoice) {
  return (invoice.paymentBreakdown ?? []).filter(
    (part) => Number(part.amount) > 0,
  );
}

function paymentDisplay(invoice: ReceiptInvoice) {
  const parts = paymentParts(invoice);

  if (parts.length > 0) {
    return [...new Set(parts.map((part) => formatPaymentMethod(part.method)))].join(" + ");
  }

  if (invoice.paymentMethod === "split") {
    return "Cash + UPI";
  }

  return invoice.paymentMethod
    ? formatPaymentMethod(invoice.paymentMethod)
    : "Not specified";
}

function kotActionLabel(
  action: ReceiptInvoice["items"][number]["kotAction"],
) {
  const labels = {
    initial: "PREPARE",
    addition: "ADD",
    modification: "UPDATE",
    cancellation: "CANCEL",
    instruction_update: "INSTRUCTION UPDATE",
  } as const;

  return labels[action ?? "initial"];
}

function kotHeading(type: ReceiptInvoice["kotType"]) {
  const headings = {
    initial: "KITCHEN ORDER TICKET",
    addition: "KOT ADDITION",
    modification: "KOT MODIFICATION",
    cancellation: "KOT CANCELLATION",
    instruction_update: "KOT INSTRUCTION UPDATE",
  } as const;

  return headings[type ?? "initial"];
}

function itemDetails(item: ReceiptInvoice["items"][number]) {
  return [item.variantName, ...(item.modifiers ?? []).map((m) => [m.groupName, m.optionName].filter(Boolean).join(": "))]
    .filter(Boolean).map(String);
}

function autoPrintScript(nextPrintUrl?: string) {
  const nextUrl = nextPrintUrl ? JSON.stringify(nextPrintUrl) : "null";
  return `<script>(()=>{const nextUrl=${nextUrl};let advanced=false;const advance=()=>{if(!nextUrl||advanced)return;advanced=true;window.setTimeout(()=>{window.location.href=nextUrl;},180);};window.addEventListener("afterprint",advance,{once:true});window.addEventListener("load",()=>{const images=Array.from(document.images);Promise.all(images.map((image)=>image.complete?Promise.resolve():new Promise((resolve)=>{image.addEventListener("load",resolve,{once:true});image.addEventListener("error",resolve,{once:true});}))).finally(()=>window.setTimeout(()=>window.print(),260));});})();</script>`;
}

function shell(title: string, width: ReceiptPaper, body: string, nextPrintUrl?: string) {
  const mm = width === "58mm" ? 58 : 80;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeInvoiceHtml(title)}</title><style>
  *{box-sizing:border-box}html{-webkit-print-color-adjust:exact;print-color-adjust:exact;background:#fff}html,body{height:auto;min-height:0}body{width:${mm}mm;margin:0 auto;padding:7px;background:#fff;color:#111;font:${width === "58mm" ? "14px/1.3" : "12px/1.3"} ui-monospace,SFMono-Regular,Menlo,monospace;overflow:visible}.toolbar{position:sticky;top:0;z-index:5;padding-bottom:8px;background:#fff}.toolbar button{width:100%;padding:9px;font-weight:900}.ticket{display:block;width:100%;height:auto;min-height:0;padding:1px 0;overflow:visible;break-inside:auto;page-break-inside:auto}.ticket+.ticket{break-before:page;page-break-before:always}.center{text-align:center}.muted{color:#555}.rule{border-top:1px dashed #111;margin:6px 0}.brand{font-size:${width === "58mm" ? 21 : 17}px;font-weight:1000}.label{font-size:${width === "58mm" ? 12 : 10}px;font-weight:900;letter-spacing:.16em}.token{margin:6px 0;border:3px solid #111;padding:6px;text-align:center;break-inside:avoid;page-break-inside:avoid}.token span{display:block;font-size:${width === "58mm" ? 12 : 10}px;font-weight:900;letter-spacing:.15em}.token strong{display:block;font-size:${width === "58mm" ? 38 : 40}px;line-height:1}.meta{display:grid;gap:${width === "58mm" ? 3 : 1}px;font-size:${width === "58mm" ? 13 : 12}px;break-inside:avoid;page-break-inside:avoid}.item{padding:6px 0;border-bottom:1px dashed #555;break-inside:avoid;page-break-inside:avoid}.item-head{display:flex;justify-content:space-between;gap:8px}.item-name{font-size:${width === "58mm" ? 18 : 14}px;font-weight:1000;line-height:1.2}.qty{flex:0 0 auto;font-size:${width === "58mm" ? 21 : 16}px;font-weight:1000}.details{margin-top:3px;font-size:${width === "58mm" ? 13 : 10}px;line-height:1.35}.instructions{margin-top:4px;padding:${width === "58mm" ? 7 : 5}px;border:2px solid #111;font-size:${width === "58mm" ? 14 : 12}px;line-height:1.3;font-weight:900;text-transform:uppercase;break-inside:avoid;page-break-inside:avoid}.totals{display:grid;gap:3px;break-inside:avoid;page-break-inside:avoid}.total-row{display:flex;justify-content:space-between;gap:10px}.grand{margin-top:4px;padding-top:5px;border-top:2px solid #111;font-size:16px;font-weight:1000}.footer{margin-top:7px;text-align:center;font-size:${width === "58mm" ? 12 : 10}px;font-weight:800;break-inside:avoid;page-break-inside:avoid}
.premium-invoice{position:relative;overflow:hidden;padding:0 0 7px;background:#fff;border:1px solid #eadfc7;border-radius:8px;font-family:Inter,Poppins,Arial,sans-serif;color:#1f2732}.premium-stripe{height:5px;background:linear-gradient(90deg,#c70d12 0 46%,#c8aa5b 46% 69%,#ff4a1f 69% 100%)}.premium-header{display:flex;align-items:center;gap:8px;padding:10px 8px 8px}.premium-logo{width:38px;height:38px;object-fit:contain;flex:none}.premium-brand-copy{min-width:0}.premium-kicker{font-size:7px;font-weight:900;letter-spacing:.13em;color:#c70d12}.premium-brand{font-size:16px;line-height:1.05;font-weight:1000;color:#343d4d}.premium-subtitle{margin-top:2px;font-size:7px;line-height:1.25;color:#69717d}.premium-invoice-title{margin:0 7px 7px;padding:8px;border-radius:7px;background:#343d4d;color:#fff;display:flex;align-items:center;justify-content:space-between;gap:6px}.premium-invoice-title span{display:block;font-size:8px;font-weight:1000;letter-spacing:.14em}.premium-invoice-title strong{display:block;margin-top:2px;font-size:9px;overflow-wrap:anywhere}.premium-paid{flex:none;padding:3px 6px;border-radius:999px;background:#dff4e7;color:#18854b;font-size:7px;font-weight:1000}.premium-meta-card,.premium-customer-card,.premium-totals-card{margin:0 7px 7px;padding:7px;border:1px solid #eadfc7;border-left:3px solid #c8aa5b;border-radius:7px;background:#fffdf8}.premium-meta-row,.premium-total-row{display:flex;align-items:flex-start;justify-content:space-between;gap:7px;padding:2px 0;font-size:8px}.premium-meta-row span,.premium-total-row span{color:#707782}.premium-meta-row strong,.premium-total-row strong{text-align:right;color:#252d39}.premium-wrap{max-width:68%;overflow-wrap:anywhere}.premium-section-title{font-size:7px;font-weight:1000;letter-spacing:.14em;color:#c70d12}.premium-items-title{margin:9px 8px 3px}.premium-items{margin:0 7px;border:1px solid #e7dcc1;border-radius:7px;overflow:hidden}.premium-item{padding:7px;background:#fff}.premium-item+.premium-item{border-top:1px dashed #c9bdab}.premium-item:nth-child(even){background:#fffaf1}.premium-item-top{display:flex;justify-content:space-between;align-items:flex-start;gap:7px}.premium-item-copy{min-width:0}.premium-item-name{font-size:10px;line-height:1.2;font-weight:1000;color:#252d39}.premium-item-details{margin-top:2px;font-size:7px;line-height:1.35;color:#6c727d}.premium-instructions{margin-top:4px;padding:4px;border-left:2px solid #ff4a1f;background:#fff3ed;font-size:7px;line-height:1.35;color:#8d2e18}.premium-qty{flex:none;font-size:11px;font-weight:1000;color:#c70d12}.premium-item-pricing{display:flex;justify-content:space-between;gap:6px;margin-top:5px;padding-top:4px;border-top:1px dotted #ded4c2;font-size:8px}.premium-item-pricing span{color:#707782}.premium-item-pricing strong{color:#252d39}.premium-totals-card{margin-top:8px;border-left-color:#c70d12}.premium-discount strong{color:#18854b}.premium-grand-total{display:flex;justify-content:space-between;align-items:center;gap:6px;margin:5px -7px -7px;padding:8px 7px;border-radius:0 0 6px 6px;background:#c70d12;color:#fff}.premium-grand-total span{font-size:8px;font-weight:1000;letter-spacing:.07em}.premium-grand-total strong{font-size:14px;font-weight:1000}.premium-cash-summary{margin-top:8px;padding-top:5px;border-top:1px dashed #c9bdab}.premium-thanks{margin:8px 7px;padding:8px;border-radius:7px;background:#f6ebca;color:#5d4a18;text-align:center}.premium-thanks strong{display:block;font-size:9px;color:#c70d12}.premium-thanks span{display:block;margin-top:2px;font-size:7px}.premium-social-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;margin:7px;break-inside:avoid;page-break-inside:avoid}.premium-social-grid-single{grid-template-columns:minmax(0,1fr)}.premium-social-card{min-width:0;padding:5px 3px;border:1px dashed #c8aa5b;border-radius:7px;background:#fffdf8;text-align:center;break-inside:avoid;page-break-inside:avoid}.premium-instagram-card{border-color:#d62976;background:linear-gradient(145deg,#fff 0%,#fff8fc 100%)}.premium-social-title{margin-bottom:4px;font-size:6px;font-weight:1000;letter-spacing:.09em;color:#343d4d}.premium-social-card img{display:block;width:43px;height:43px;margin:0 auto 3px;padding:2px;border-radius:5px;background:#fff;object-fit:contain}.premium-social-caption{font-size:5.6px;line-height:1.25;color:#6c727d}.premium-social-handle{display:block;margin-top:2px;font-size:6px;font-weight:1000;color:#d62976}.premium-58 .premium-social-grid{gap:3px;margin-left:5px;margin-right:5px}.premium-58 .premium-social-card{padding:4px 2px}.premium-58 .premium-social-card img{width:34px;height:34px}.premium-58 .premium-social-title{font-size:5.4px}.premium-58 .premium-social-caption{font-size:4.9px}.premium-58 .premium-social-handle{font-size:5.3px}.premium-footer{display:flex;align-items:center;justify-content:center;gap:5px;padding:3px 7px 0;color:#343d4d}.premium-footer img{width:24px;height:24px;object-fit:contain}.premium-footer div{display:flex;flex-direction:column}.premium-footer strong{font-size:8px}.premium-footer span{font-size:6px;color:#6c727d}.premium-58 .premium-header{gap:6px;padding-left:6px;padding-right:6px}.premium-58 .premium-logo{width:31px;height:31px}.premium-58 .premium-brand{font-size:13px}.premium-58 .premium-subtitle{font-size:6px}.premium-58 .premium-invoice-title,.premium-58 .premium-meta-card,.premium-58 .premium-customer-card,.premium-58 .premium-totals-card,.premium-58 .premium-items,.premium-58 .premium-thanks{margin-left:5px;margin-right:5px}.premium-58 .premium-items-title{margin-left:6px}.premium-58 .premium-meta-row,.premium-58 .premium-total-row{font-size:7px}.premium-58 .premium-item-name{font-size:9px}.premium-58 .premium-grand-total strong{font-size:12px}.premium-thanks{margin:8px 7px;padding:7px;text-align:center;background:#fff;border-top:1px dashed #c8aa5b;border-bottom:1px dashed #c8aa5b}.premium-thanks strong{display:block;font-family:"Brush Script MT","Segoe Script",cursive;font-size:22px;line-height:1;color:#c70d12;font-weight:500}.premium-thanks span{display:block;margin-top:3px;font-size:6px;font-weight:1000;letter-spacing:.18em;color:#343d4d}.premium-verification-single{margin:7px;padding:5px;border:1px dashed #c8aa5b;border-radius:7px;text-align:center;break-inside:avoid;page-break-inside:avoid}.premium-verification-single img{display:block;width:44px;height:44px;margin:0 auto 3px;padding:2px;background:#fff}.premium-engagement-title{margin:7px 5px 4px;text-align:center;font-size:6px;font-weight:1000;letter-spacing:.12em}.premium-social-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px;margin:5px 7px}.premium-social-card img{width:38px;height:38px}.premium-social-title{font-size:5.5px}.premium-social-caption,.premium-social-handle{font-size:5px}.premium-58 .premium-thanks strong{font-size:18px}.premium-58 .premium-social-card img{width:31px;height:31px}.thermal-invoice{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace!important;color:#000!important;background:#fff!important;border:0!important;border-radius:0!important;padding:0!important}.thermal-invoice *{color:#000!important;background:transparent!important;box-shadow:none!important;text-shadow:none!important}.thermal-invoice-header{padding:0 0 3px}.thermal-invoice-logo{display:block;width:78px;height:78px;margin:0 auto 5px;object-fit:contain;image-rendering:auto}.thermal-invoice-brand{font-size:16px;font-weight:1000;line-height:1.1;letter-spacing:.04em}.thermal-invoice-tagline{margin-top:2px;font-size:9px;font-weight:900;letter-spacing:.08em}.thermal-invoice-small{margin-top:2px;font-size:9px;line-height:1.25;overflow-wrap:anywhere}.thermal-invoice-rule{border-top:1.5px dashed #000;margin:6px 0}.thermal-invoice-rule-solid{border-top-style:solid;border-top-width:2px}.thermal-invoice-title{font-size:13px;font-weight:1000;letter-spacing:.12em}.thermal-invoice-number{margin-top:2px;font-size:11px;font-weight:1000;overflow-wrap:anywhere}.thermal-invoice-status{display:inline-block;margin:4px auto 0;padding:2px 7px;border:2px solid #000;font-size:10px;font-weight:1000;letter-spacing:.08em}.thermal-invoice-meta{display:grid;gap:3px}.thermal-invoice-row{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;font-size:11px;line-height:1.3}.thermal-invoice-row>span{flex:0 0 auto}.thermal-invoice-row>strong{min-width:0;text-align:right;overflow-wrap:anywhere}.thermal-invoice-section-label{margin:2px 0 4px;font-size:10px;font-weight:1000;letter-spacing:.12em}.thermal-invoice-items{display:block}.thermal-invoice-item{padding:6px 0;border-bottom:1px dashed #000;break-inside:avoid;page-break-inside:avoid}.thermal-invoice-item:last-child{border-bottom:0}.thermal-invoice-item-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;font-size:13px;line-height:1.25}.thermal-invoice-item-head strong{min-width:0;overflow-wrap:anywhere}.thermal-invoice-item-head span{flex:none;font-size:14px;font-weight:1000}.thermal-invoice-details{margin-top:3px;font-size:10px;line-height:1.35;overflow-wrap:anywhere}.thermal-invoice-special{margin-top:4px;padding:4px;border:1.5px solid #000;font-size:10px;line-height:1.3;font-weight:800}.thermal-invoice-price-row{display:flex;justify-content:space-between;gap:8px;margin-top:4px;font-size:10px}.thermal-invoice-price-row strong{font-size:11px}.thermal-invoice-totals{display:grid;gap:4px}.thermal-invoice-totals .thermal-invoice-row{font-size:11px}.thermal-invoice-grand{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:5px 0;padding:6px 0;border-top:3px double #000;border-bottom:3px double #000;font-size:14px;font-weight:1000}.thermal-invoice-grand strong{font-size:16px}.thermal-invoice-payment-block{display:grid;gap:3px;margin-top:5px;padding-top:5px;border-top:1px dashed #000}.thermal-invoice-verification{margin:8px 0 4px;text-align:center;break-inside:avoid;page-break-inside:avoid}.thermal-invoice-verification>strong{display:block;font-size:11px;letter-spacing:.1em}.thermal-invoice-verification img{display:block;width:150px;height:150px;margin:7px auto 4px;padding:0;background:#fff;object-fit:contain;image-rendering:auto}.thermal-invoice-verification span{font-size:9px;font-weight:800}.thermal-invoice-connect{display:grid;gap:4px;font-size:9px;line-height:1.25}.thermal-social-grid{display:grid;grid-template-columns:1fr;gap:9px;margin-top:6px;break-inside:avoid;page-break-inside:avoid}.thermal-social-card{text-align:center;break-inside:avoid;page-break-inside:avoid}.thermal-social-card img{display:block;width:${width === "58mm" ? 150 : 170}px;height:${width === "58mm" ? 150 : 170}px;margin:0 auto 4px;padding:0;background:#fff;object-fit:contain;image-rendering:auto}.thermal-social-card strong{display:block;font-size:10px;line-height:1.1}.thermal-social-card span{display:block;margin-top:2px;font-size:9px;line-height:1.2}.thermal-invoice-contact{margin-top:3px;font-size:10px;font-weight:1000}.thermal-invoice-footer{display:grid;gap:2px;padding:1px 0 4px}.thermal-invoice-footer strong{font-size:18px;line-height:1;font-weight:1000}.thermal-invoice-footer span{font-size:10px;font-weight:1000;letter-spacing:.18em}.thermal-invoice-footer small{margin-top:3px;font-size:8px}.thermal-invoice-58 .thermal-invoice-brand{font-size:15px}.thermal-invoice-58 .thermal-invoice-item-head{font-size:12px}.thermal-invoice-58 .thermal-invoice-row{font-size:10.5px}.thermal-invoice-58 .thermal-invoice-grand{font-size:13px}.thermal-invoice-58 .thermal-invoice-grand strong{font-size:15px}.thermal-invoice-58 .thermal-invoice-logo{width:82px;height:82px}.thermal-invoice-58 .thermal-invoice-verification img{width:150px;height:150px}.thermal-invoice-58 .thermal-social-card img{width:150px;height:150px}.thermal-invoice-80 .thermal-invoice-brand{font-size:19px}.thermal-invoice-80 .thermal-invoice-tagline{font-size:10px}.thermal-invoice-80 .thermal-invoice-row{font-size:12px}.thermal-invoice-80 .thermal-invoice-item-head{font-size:14px}.thermal-invoice-80 .thermal-invoice-logo{width:92px;height:92px}.thermal-invoice-80 .thermal-invoice-verification img{width:170px;height:170px}.thermal-invoice-80 .thermal-social-grid{grid-template-columns:1fr;gap:9px}.thermal-invoice-80 .thermal-social-card img{width:170px;height:170px}@page{size:${mm}mm auto;margin:0}@media print{html,body{width:${mm}mm!important;height:auto!important;min-height:0!important;margin:0!important;padding:0!important;overflow:visible!important}.no-print{display:none!important}.ticket{width:${mm}mm!important;height:auto!important;min-height:0!important;margin:0!important;padding:${width === "58mm" ? "2mm 2.2mm 1.5mm" : "2.4mm 3mm 1.8mm"}!important;overflow:visible!important;break-before:auto!important;page-break-before:auto!important;break-after:auto!important;page-break-after:auto!important;break-inside:auto!important;page-break-inside:auto!important}.ticket+.ticket{break-before:page!important;page-break-before:always!important}.premium-invoice{height:auto!important;min-height:0!important;overflow:visible!important;break-inside:auto!important;page-break-inside:auto!important}.premium-header,.premium-invoice-title,.premium-meta-card,.premium-customer-card,.premium-item,.premium-totals-card,.premium-thanks,.premium-footer{break-inside:avoid!important;page-break-inside:avoid!important}}</style>${autoPrintScript(nextPrintUrl)}</head><body><div class="toolbar no-print"><button onclick="window.print()">Print</button></div>${body}</body></html>`;
}

function kotTicket(
  invoice: ReceiptInvoice,
  options: Required<KotOptions>,
) {
  const printedAt = new Date();

  const items = invoice.items
    .map((item) => {
      const details = itemDetails(item);
      const action =
        item.kotAction ?? invoice.kotType ?? "initial";
      const changeSummary = item.changeSummary?.length
        ? `<div class="instructions">${item.changeSummary
            .map(escapeInvoiceHtml)
            .join("<br>")}</div>`
        : "";

      return `<div class="item">
        <div class="label">${escapeInvoiceHtml(
          kotActionLabel(action),
        )}</div>
        <div class="item-head">
          <div>
            <div class="item-name">${escapeInvoiceHtml(
              item.name,
            )}</div>
            ${
              details.length
                ? `<div class="details">${details
                    .map(escapeInvoiceHtml)
                    .join("<br>")}</div>`
                : ""
            }
          </div>
          <div class="qty">×${item.quantity}</div>
        </div>
        ${
          item.previousQuantity !== undefined ||
          item.newQuantity !== undefined
            ? `<div class="details"><strong>Previous:</strong> ${
                item.previousQuantity ?? "—"
              } &nbsp; <strong>New:</strong> ${
                item.newQuantity ?? "—"
              }</div>`
            : ""
        }
        ${
          item.specialInstructions?.trim()
            ? `<div class="instructions">SPECIAL: ${escapeInvoiceHtml(
                item.specialInstructions.trim(),
              )}</div>`
            : ""
        }
        ${changeSummary}
        ${
          options.showPrices
            ? `<div class="details">${escapeInvoiceHtml(
                formatInvoiceMoney(
                  item.lineTotal,
                  invoice.currency ?? "INR",
                ),
              )}</div>`
            : ""
        }
      </div>`;
    })
    .join("");

  const orderNoteChanged =
    invoice.kotOrderNote !== undefined &&
    invoice.kotOrderNote !==
      invoice.kotPreviousOrderNote;

  return `<section class="ticket">
    <div class="center">
      <div class="brand">THE ROLLING STOVE</div>
      <div class="label">${escapeInvoiceHtml(
        kotHeading(invoice.kotType),
      )}</div>
      ${
        invoice.kotRevision
          ? `<div class="label">REVISION #${invoice.kotRevision}</div>`
          : ""
      }
    </div>

    <div class="token">
      <span>KITCHEN TOKEN</span>
      <strong>${escapeInvoiceHtml(
        token(
          invoice.orderNumber,
          invoice.kitchenToken,
        ),
      )}</strong>
    </div>

    <div class="rule"></div>

    <div class="meta">
      <div><strong>Order:</strong> ${escapeInvoiceHtml(
        invoice.orderNumber,
      )}</div>
      <div><strong>Placed:</strong> ${escapeInvoiceHtml(
        formatReceiptDateTime(invoice.issuedAt),
      )}</div>
      <div><strong>Type:</strong> ${
        invoice.orderMode === "dine_in"
          ? `Dine-in · Table ${escapeInvoiceHtml(
              invoice.tableNumber || "Not assigned",
            )}`
          : "Takeaway"
      }</div>
      ${
        options.showCustomer
          ? `<div><strong>Customer:</strong> ${escapeInvoiceHtml(
              invoice.customerSnapshot?.name ||
                "Walk-in Customer",
            )}</div>`
          : ""
      }
      <div><strong>Printed:</strong> ${escapeInvoiceHtml(
        formatReceiptDateTime(printedAt),
      )}</div>
    </div>

    <div class="rule"></div>

    ${
      items ||
      `<div class="instructions">ORDER NOTE UPDATED</div>`
    }

    ${
      orderNoteChanged
        ? `<div class="instructions"><strong>ORDER NOTE:</strong><br>${escapeInvoiceHtml(
            invoice.kotOrderNote || "Removed",
          )}</div>`
        : ""
    }

    <div class="rule"></div>

    <div class="center">
      <strong>Affected quantity: ${invoice.items.reduce(
        (sum, item) => sum + item.quantity,
        0,
      )}</strong>
    </div>

    <div class="footer">Printed from TRS POS</div>
  </section>`;
}

function thermalInvoiceTicket(invoice: ReceiptInvoice, options: Required<InvoiceOptions>) {
  const business = invoice.businessSnapshot ?? {};
  const businessName = business.tradeName || business.legalName || "The Rolling Stove";
  const currency = invoice.currency ?? "INR";
  const is58 = options.paper === "58mm";
  const contactNumber = business.phone?.trim() || `+91 ${TRS_CONTACT_NUMBER.slice(0, 5)} ${TRS_CONTACT_NUMBER.slice(5)}`;
  const customerEmail = invoice.customerSnapshot?.email?.trim();
  const showCustomerEmail = Boolean(
    customerEmail &&
      !customerEmail.endsWith("@customer.trs.local") &&
      !customerEmail.startsWith("pos-"),
  );

  const itemRows = invoice.items
    .map((item) => {
      const details = itemDetails(item);
      const instructions = item.specialInstructions?.trim();

      return `<div class="thermal-invoice-item">
        <div class="thermal-invoice-item-head">
          <strong>${escapeInvoiceHtml(item.name)}</strong>
          <span>×${escapeInvoiceHtml(item.quantity)}</span>
        </div>
        ${
          details.length
            ? `<div class="thermal-invoice-details">${details
                .map(escapeInvoiceHtml)
                .join(" · ")}</div>`
            : ""
        }
        ${
          instructions
            ? `<div class="thermal-invoice-special"><strong>Special:</strong> ${escapeInvoiceHtml(
                instructions,
              )}</div>`
            : ""
        }
        <div class="thermal-invoice-price-row">
          <span>${escapeInvoiceHtml(formatInvoiceMoney(item.unitPrice, currency))} × ${escapeInvoiceHtml(item.quantity)}</span>
          <strong>${escapeInvoiceHtml(formatInvoiceMoney(item.lineTotal, currency))}</strong>
        </div>
      </div>`;
    })
    .join("");

  const chargeRows = [
    invoice.packingCharge && invoice.packingCharge > 0
      ? `<div class="thermal-invoice-row"><span>Packing charge</span><strong>${escapeInvoiceHtml(formatInvoiceMoney(invoice.packingCharge, currency))}</strong></div>`
      : "",
    invoice.serviceCharge && invoice.serviceCharge > 0
      ? `<div class="thermal-invoice-row"><span>Service charge</span><strong>${escapeInvoiceHtml(formatInvoiceMoney(invoice.serviceCharge, currency))}</strong></div>`
      : "",
    invoice.additionalCharge && invoice.additionalCharge > 0
      ? `<div class="thermal-invoice-row"><span>${escapeInvoiceHtml(invoice.additionalChargeLabel || "Additional charge")}</span><strong>${escapeInvoiceHtml(formatInvoiceMoney(invoice.additionalCharge, currency))}</strong></div>`
      : "",
  ].join("");

  const taxRows =
    options.showTaxBreakup && invoice.taxTotal > 0
      ? `<div class="thermal-invoice-row"><span>CGST</span><strong>${escapeInvoiceHtml(formatInvoiceMoney(invoice.taxTotal / 2, currency))}</strong></div>
         <div class="thermal-invoice-row"><span>SGST</span><strong>${escapeInvoiceHtml(formatInvoiceMoney(invoice.taxTotal / 2, currency))}</strong></div>`
      : invoice.taxTotal > 0
        ? `<div class="thermal-invoice-row"><span>Tax</span><strong>${escapeInvoiceHtml(formatInvoiceMoney(invoice.taxTotal, currency))}</strong></div>`
        : "";

  const verificationSection =
    options.showInvoiceQr === true &&
    invoice.verificationEnabled !== false &&
    invoice.verificationPublicId
      ? `<div class="thermal-invoice-verification">
          <strong>VERIFY INVOICE</strong>
          <img src="${escapeInvoiceHtml(
            `${invoiceQrImageUrl({
              publicId: invoice.verificationPublicId,
              invoiceNumber: invoice.invoiceNumber,
            })}&thermal=1`,
          )}" alt="Invoice verification QR code" />
          <span>Scan to verify securely</span>
        </div>`
      : "";

  return `<section class="ticket thermal-invoice ${is58 ? "thermal-invoice-58" : "thermal-invoice-80"}">
    <header class="thermal-invoice-header center">
      <img class="thermal-invoice-logo" src="${THERMAL_LOGO_PATH}" alt="TRS logo" />
      <div class="thermal-invoice-brand">${escapeInvoiceHtml(businessName).toUpperCase()}</div>
      <div class="thermal-invoice-tagline">FRESH • HOT • DELICIOUS</div>
      ${business.gstin ? `<div class="thermal-invoice-small">GSTIN: ${escapeInvoiceHtml(business.gstin)}</div>` : ""}
      ${business.address ? `<div class="thermal-invoice-small">${escapeInvoiceHtml(business.address)}</div>` : ""}
      <div class="thermal-invoice-small">Contact: ${escapeInvoiceHtml(contactNumber)}</div>
    </header>

    <div class="thermal-invoice-rule thermal-invoice-rule-solid"></div>

    <div class="thermal-invoice-title center">TAX INVOICE</div>
    <div class="thermal-invoice-number center">${escapeInvoiceHtml(invoice.invoiceNumber)}</div>
    <div class="thermal-invoice-status center">${escapeInvoiceHtml((invoice.paymentStatus || "PAID").toUpperCase())}</div>

    <div class="thermal-invoice-rule"></div>

    <section class="thermal-invoice-meta">
      <div class="thermal-invoice-row"><span>Order</span><strong>${escapeInvoiceHtml(invoice.orderNumber)}</strong></div>
      <div class="thermal-invoice-row"><span>Issued</span><strong>${escapeInvoiceHtml(formatReceiptDateTime(invoice.issuedAt))}</strong></div>
      <div class="thermal-invoice-row"><span>Type</span><strong>${invoice.orderMode === "dine_in" ? `Dine-in${invoice.tableNumber ? ` · Table ${escapeInvoiceHtml(invoice.tableNumber)}` : ""}` : "Takeaway"}</strong></div>
      <div class="thermal-invoice-row"><span>Payment</span><strong>${escapeInvoiceHtml(paymentDisplay(invoice))}</strong></div>
    </section>

    ${
      invoice.customerSnapshot?.name ||
      invoice.customerSnapshot?.phone ||
      showCustomerEmail
        ? `<div class="thermal-invoice-rule"></div>
           <section class="thermal-invoice-meta">
             <div class="thermal-invoice-section-label">CUSTOMER</div>
             ${invoice.customerSnapshot?.name ? `<div class="thermal-invoice-row"><span>Name</span><strong>${escapeInvoiceHtml(invoice.customerSnapshot.name)}</strong></div>` : ""}
             ${invoice.customerSnapshot?.phone ? `<div class="thermal-invoice-row"><span>Phone</span><strong>${escapeInvoiceHtml(invoice.customerSnapshot.phone)}</strong></div>` : ""}
             ${showCustomerEmail && customerEmail ? `<div class="thermal-invoice-row thermal-invoice-wrap"><span>Email</span><strong>${escapeInvoiceHtml(customerEmail)}</strong></div>` : ""}
           </section>`
        : ""
    }

    <div class="thermal-invoice-rule thermal-invoice-rule-solid"></div>
    <div class="thermal-invoice-section-label center">ORDER ITEMS</div>
    <section class="thermal-invoice-items">${itemRows}</section>

    <div class="thermal-invoice-rule thermal-invoice-rule-solid"></div>

    <section class="thermal-invoice-totals">
      <div class="thermal-invoice-row"><span>Subtotal</span><strong>${escapeInvoiceHtml(formatInvoiceMoney(invoice.subtotal, currency))}</strong></div>
      ${taxRows}
      ${chargeRows}
      ${
        invoice.discountTotal > 0
          ? `<div class="thermal-invoice-row"><span>Discount</span><strong>−${escapeInvoiceHtml(formatInvoiceMoney(invoice.discountTotal, currency))}</strong></div>`
          : ""
      }
      <div class="thermal-invoice-grand"><span>GRAND TOTAL</span><strong>${escapeInvoiceHtml(formatInvoiceMoney(invoice.grandTotal, currency))}</strong></div>
      ${
        paymentParts(invoice).length > 1
          ? `<div class="thermal-invoice-payment-block">
              <div class="thermal-invoice-section-label">PAYMENT BREAKUP</div>
              ${paymentParts(invoice)
                .map(
                  (part) => `<div class="thermal-invoice-row"><span>${escapeInvoiceHtml(
                    formatPaymentMethod(part.method),
                  )}</span><strong>${escapeInvoiceHtml(
                    formatInvoiceMoney(part.amount, currency),
                  )}</strong></div>`,
                )
                .join("")}
            </div>`
          : ""
      }
      ${
        invoice.paymentMethod === "cash"
          ? `<div class="thermal-invoice-payment-block">
              <div class="thermal-invoice-row"><span>Cash received</span><strong>${escapeInvoiceHtml(formatInvoiceMoney(invoice.amountTendered ?? invoice.grandTotal, currency))}</strong></div>
              <div class="thermal-invoice-row"><span>Change returned</span><strong>${escapeInvoiceHtml(formatInvoiceMoney(invoice.changeDue ?? 0, currency))}</strong></div>
            </div>`
          : ""
      }
    </section>

    ${verificationSection}

    <div class="thermal-invoice-rule"></div>
    <section class="thermal-invoice-connect center">
      <div class="thermal-invoice-section-label">CONNECT WITH TRS</div>
      <div class="thermal-social-grid">
        <div class="thermal-social-card">
          <img src="${escapeInvoiceHtml(`${TRS_INSTAGRAM_QR_IMAGE_URL}&thermal=1`)}" alt="Instagram QR code" />
          <strong>INSTAGRAM</strong>
          <span>@${escapeInvoiceHtml(TRS_INSTAGRAM_USERNAME)}</span>
        </div>
        <div class="thermal-social-card">
          <img src="${escapeInvoiceHtml(`${TRS_REVIEWS_QR_IMAGE_URL}&thermal=1`)}" alt="Google Reviews QR code" />
          <strong>REVIEW US</strong>
          <span>Scan to leave a Google review</span>
        </div>
      </div>
      <div class="thermal-invoice-contact">Contact: ${escapeInvoiceHtml(contactNumber)}</div>
    </section>

    <div class="thermal-invoice-rule"></div>
    <footer class="thermal-invoice-footer center">
      <strong>THANK YOU!</strong>
      <span>VISIT AGAIN</span>
      <small>Printed from TRS POS</small>
    </footer>
  </section>`;
}

export function renderKotHtml(invoice: ReceiptInvoice, options: KotOptions = {}) {
  const resolved: Required<KotOptions> = {
    paper: options.paper ?? "80mm",
    copies: Math.min(3, Math.max(1, options.copies ?? 1)),
    showCustomer: options.showCustomer ?? false,
    showPrices: options.showPrices ?? false,
    nextPrintUrl: options.nextPrintUrl ?? "",
  };
  return shell(
    `KOT ${invoice.orderNumber}`,
    resolved.paper,
    Array.from({ length: resolved.copies }, () => kotTicket(invoice, resolved)).join(""),
    resolved.nextPrintUrl || undefined,
  );
}

export function renderThermalInvoiceHtml(invoice: ReceiptInvoice, options: InvoiceOptions = {}) {
  const resolved: {
    paper: ReceiptPaper;
    copies: number;
    showTaxBreakup: boolean;
    showInvoiceQr: boolean;
  } = {
    paper: options.paper === "58mm" ? "58mm" : "80mm",
    copies: Math.min(3, Math.max(1, options.copies ?? 1)),
    showTaxBreakup: options.showTaxBreakup ?? true,
    showInvoiceQr: options.showInvoiceQr ?? false,
  };
  return shell(invoice.invoiceNumber, resolved.paper, Array.from({length:resolved.copies},()=>thermalInvoiceTicket(invoice,resolved)).join(""));
}

export function renderCompactReceiptHtml(invoice: ReceiptInvoice, format: "thermal" | "kitchen") {
  return format === "kitchen" ? renderKotHtml(invoice) : renderThermalInvoiceHtml(invoice);
}

export function renderKotCopiesHtml(invoice: ReceiptInvoice) { return renderKotHtml(invoice); }

export function renderKotAndInvoiceHtml(invoice: ReceiptInvoice) {
  const branded = renderInvoiceHtml(invoice, {
    showVerificationQr: false,
  });
  const style = branded.match(/<style>([\s\S]*?)<\/style>/i)?.[1] ?? "";
  const main = branded.match(/<main class="invoice-shell">[\s\S]*?<\/main>/i)?.[0] ?? "";
  return `<!doctype html><html><head><meta charset="utf-8"><title>KOT and Invoice ${escapeInvoiceHtml(invoice.orderNumber)}</title><style>${style}body{margin:0}.bundle-note{padding:12px;text-align:center;font:800 14px system-ui}.kot-wrap{width:80mm;margin:0 auto}.invoice-wrap{break-before:page;page-break-before:always}@media print{.bundle-note{display:none}}</style><script>window.addEventListener("load",()=>setTimeout(()=>window.print(),250))</script></head><body><div class="bundle-note">Legacy combined print. Use separate KOT and invoice buttons for production printing.</div><div class="kot-wrap">${kotTicket(invoice,{paper:"80mm",copies:1,showCustomer:false,showPrices:false,nextPrintUrl:""})}</div><div class="invoice-wrap">${main}</div></body></html>`;
}
