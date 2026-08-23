import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

type DailyStockCountPdfInput = {
  countNumber: string;
  status: string;
  countedAt: Date | string;
  notes?: string;
  createdByName?: string;
  postedByName?: string;
  items: Array<{
    itemName: string;
    systemQuantity: number;
    countedQuantity: number;
    varianceQuantity: number;
    unitCost: number;
    varianceValue: number;
    reason?: string;
  }>;
};

type PurchaseRequirementPdfRow = {
  name: string;
  sku: string;
  category: string;
  unit: string;
  currentStock: number;
  reorderLevel: number;
  targetStock: number;
  suggestedQuantity: number;
  averageUnitCost: number;
  estimatedValue: number;
  priority: string;
};

type PdfContext = {
  document: PDFDocument;
  page: PDFPage;
  regular: PDFFont;
  bold: PDFFont;
  y: number;
};

const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;
const MARGIN = 34;

function safeText(value: unknown): string {
  return String(value ?? "").replaceAll("₹", "INR ").replaceAll("–", "-").replaceAll("—", "-");
}

function money(value: number): string {
  return `INR ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function clipped(text: string, maxLength: number): string {
  const normalized = safeText(text);
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, Math.max(0, maxLength - 3))}...`;
}

function addPage(context: PdfContext, title: string): void {
  context.page = context.document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  context.y = PAGE_HEIGHT - MARGIN;
  context.page.drawText("THE ROLLING STOVE", {
    x: MARGIN,
    y: context.y,
    size: 15,
    font: context.bold,
    color: rgb(0.78, 0.06, 0.18),
  });
  context.page.drawText(title, {
    x: MARGIN,
    y: context.y - 22,
    size: 10,
    font: context.bold,
    color: rgb(0.09, 0.19, 0.27),
  });
  context.y -= 48;
}

function drawTableHeader(
  context: PdfContext,
  columns: Array<{ label: string; x: number }>,
): void {
  context.page.drawRectangle({
    x: MARGIN,
    y: context.y - 5,
    width: PAGE_WIDTH - MARGIN * 2,
    height: 20,
    color: rgb(0.09, 0.19, 0.27),
  });
  for (const column of columns) {
    context.page.drawText(column.label, {
      x: column.x,
      y: context.y,
      size: 7,
      font: context.bold,
      color: rgb(1, 1, 1),
    });
  }
  context.y -= 23;
}

function ensureSpace(
  context: PdfContext,
  requiredHeight: number,
  title: string,
  header: () => void,
): void {
  if (context.y - requiredHeight >= MARGIN) return;
  addPage(context, `${title} - continued`);
  header();
}

export async function createDailyStockCountPdf(
  input: DailyStockCountPdfInput,
): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const context: PdfContext = {
    document,
    page: document.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
    regular,
    bold,
    y: PAGE_HEIGHT - MARGIN,
  };

  addPage(context, "Daily Stock Count Report");
  context.page.drawText(`Count: ${safeText(input.countNumber)}`, { x: MARGIN, y: context.y, size: 9, font: bold });
  context.page.drawText(`Status: ${safeText(input.status).toUpperCase()}`, { x: 260, y: context.y, size: 9, font: bold });
  context.page.drawText(`Counted: ${new Date(input.countedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`, { x: 430, y: context.y, size: 8, font: regular });
  context.y -= 17;
  context.page.drawText(`Submitted by: ${safeText(input.createdByName || "-")}`, { x: MARGIN, y: context.y, size: 8, font: regular });
  context.page.drawText(`Posted by: ${safeText(input.postedByName || "-")}`, { x: 260, y: context.y, size: 8, font: regular });
  context.y -= 17;
  if (input.notes) {
    context.page.drawText(`Notes: ${clipped(input.notes, 105)}`, { x: MARGIN, y: context.y, size: 8, font: regular });
    context.y -= 17;
  }

  const columns = [
    { label: "Item", x: 36 },
    { label: "System", x: 255 },
    { label: "Physical", x: 315 },
    { label: "Variance", x: 380 },
    { label: "Unit cost", x: 445 },
    { label: "Variance value", x: 510 },
    { label: "Reason / note", x: 595 },
  ];
  const header = () => drawTableHeader(context, columns);
  header();

  let totalVarianceValue = 0;
  for (const item of input.items) {
    ensureSpace(context, 17, "Daily Stock Count Report", header);
    totalVarianceValue += Number(item.varianceValue || 0);
    const rowY = context.y;
    context.page.drawText(clipped(item.itemName, 38), { x: 36, y: rowY, size: 7, font: regular });
    context.page.drawText(Number(item.systemQuantity || 0).toFixed(3), { x: 255, y: rowY, size: 7, font: regular });
    context.page.drawText(Number(item.countedQuantity || 0).toFixed(3), { x: 315, y: rowY, size: 7, font: regular });
    context.page.drawText(Number(item.varianceQuantity || 0).toFixed(3), { x: 380, y: rowY, size: 7, font: bold, color: item.varianceQuantity < 0 ? rgb(0.75, 0.08, 0.12) : rgb(0.05, 0.42, 0.25) });
    context.page.drawText(money(item.unitCost), { x: 445, y: rowY, size: 7, font: regular });
    context.page.drawText(money(item.varianceValue), { x: 510, y: rowY, size: 7, font: regular });
    context.page.drawText(clipped(item.reason || "-", 37), { x: 595, y: rowY, size: 7, font: regular });
    context.page.drawLine({ start: { x: MARGIN, y: rowY - 4 }, end: { x: PAGE_WIDTH - MARGIN, y: rowY - 4 }, thickness: 0.3, color: rgb(0.86, 0.88, 0.9) });
    context.y -= 16;
  }

  ensureSpace(context, 34, "Daily Stock Count Report", header);
  context.y -= 4;
  context.page.drawText(`Total items counted: ${input.items.length}`, { x: MARGIN, y: context.y, size: 9, font: bold });
  context.page.drawText(`Total variance value: ${money(totalVarianceValue)}`, { x: 500, y: context.y, size: 9, font: bold });
  context.page.drawText("Generated by TRS Inventory Management", { x: MARGIN, y: 18, size: 7, font: regular, color: rgb(0.4, 0.45, 0.5) });

  return document.save();
}

export async function createPurchaseRequirementsPdf(
  rows: PurchaseRequirementPdfRow[],
): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const context: PdfContext = {
    document,
    page: document.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
    regular,
    bold,
    y: PAGE_HEIGHT - MARGIN,
  };

  addPage(context, "Purchase Requirements Report");
  const estimatedTotal = rows.reduce((sum, row) => sum + row.estimatedValue, 0);
  context.page.drawText(`Generated: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`, { x: MARGIN, y: context.y, size: 8, font: regular });
  context.page.drawText(`Items requiring purchase: ${rows.length}`, { x: 300, y: context.y, size: 8, font: bold });
  context.page.drawText(`Estimated value: ${money(estimatedTotal)}`, { x: 570, y: context.y, size: 8, font: bold });
  context.y -= 25;

  const columns = [
    { label: "Item / SKU", x: 36 },
    { label: "Category", x: 215 },
    { label: "Current", x: 335 },
    { label: "Reorder", x: 400 },
    { label: "Target", x: 465 },
    { label: "Suggested", x: 525 },
    { label: "Unit cost", x: 600 },
    { label: "Est. value", x: 675 },
    { label: "Priority", x: 765 },
  ];
  const header = () => drawTableHeader(context, columns);
  header();

  for (const row of rows) {
    ensureSpace(context, 25, "Purchase Requirements Report", header);
    const rowY = context.y;
    context.page.drawText(clipped(row.name, 29), { x: 36, y: rowY, size: 7, font: bold });
    context.page.drawText(clipped(row.sku, 22), { x: 36, y: rowY - 9, size: 6, font: regular, color: rgb(0.4, 0.45, 0.5) });
    context.page.drawText(clipped(row.category, 20), { x: 215, y: rowY, size: 7, font: regular });
    context.page.drawText(`${row.currentStock.toFixed(3)} ${clipped(row.unit, 5)}`, { x: 335, y: rowY, size: 7, font: regular });
    context.page.drawText(row.reorderLevel.toFixed(3), { x: 400, y: rowY, size: 7, font: regular });
    context.page.drawText(row.targetStock.toFixed(3), { x: 465, y: rowY, size: 7, font: regular });
    context.page.drawText(row.suggestedQuantity.toFixed(3), { x: 525, y: rowY, size: 7, font: bold, color: rgb(0.78, 0.06, 0.18) });
    context.page.drawText(money(row.averageUnitCost), { x: 600, y: rowY, size: 7, font: regular });
    context.page.drawText(money(row.estimatedValue), { x: 675, y: rowY, size: 7, font: regular });
    context.page.drawText(row.priority.toUpperCase(), { x: 765, y: rowY, size: 6, font: bold, color: row.priority === "critical" ? rgb(0.75, 0.08, 0.12) : rgb(0.69, 0.35, 0.02) });
    context.page.drawLine({ start: { x: MARGIN, y: rowY - 13 }, end: { x: PAGE_WIDTH - MARGIN, y: rowY - 13 }, thickness: 0.3, color: rgb(0.86, 0.88, 0.9) });
    context.y -= 25;
  }

  ensureSpace(context, 30, "Purchase Requirements Report", header);
  context.page.drawText(`Estimated purchase total: ${money(estimatedTotal)}`, { x: 580, y: context.y, size: 10, font: bold, color: rgb(0.78, 0.06, 0.18) });
  context.page.drawText("Generated by TRS Inventory Management", { x: MARGIN, y: 18, size: 7, font: regular, color: rgb(0.4, 0.45, 0.5) });

  return document.save();
}
