import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ProcurementIntelligenceResult } from "@/services/procurement-intelligence.service";

const csvCell = (value: string | number | null) => {
  const text = value === null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export function procurementIntelligenceToCsv(report: ProcurementIntelligenceResult) {
  const header = ["Priority", "Item", "SKU", "Category", "Current Stock", "Daily Demand", "Days Remaining", "Purchase By", "Gross Qty", "Open PO Qty", "Net Qty", "Unit", "Supplier", "Unit Cost", "Purchase Value", "Confidence", "Flags"];
  const rows = report.recommendations.map((row) => [row.priority, row.itemName, row.sku, row.category, row.currentStock, row.forecastDailyDemand, row.daysRemaining, row.recommendedPurchaseDate, row.grossRecommendedQuantity, row.openPurchaseOrderQuantity, row.netRecommendedQuantity, row.unit, row.preferredSupplierName, row.estimatedUnitCost, row.estimatedPurchaseValue, row.confidenceScore, row.flags.join("|")].map(csvCell).join(","));
  return [header.join(","), ...rows].join("\n");
}

export async function procurementIntelligenceToXlsx(report: ProcurementIntelligenceResult) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Procurement Plan");
  sheet.columns = [
    { header: "Priority", key: "priority", width: 12 }, { header: "Item", key: "itemName", width: 28 },
    { header: "SKU", key: "sku", width: 14 }, { header: "Category", key: "category", width: 18 },
    { header: "Stock", key: "currentStock", width: 12 }, { header: "Daily demand", key: "forecastDailyDemand", width: 14 },
    { header: "Days remaining", key: "daysRemaining", width: 15 }, { header: "Purchase by", key: "recommendedPurchaseDate", width: 14 },
    { header: "Gross qty", key: "grossRecommendedQuantity", width: 13 }, { header: "Open PO qty", key: "openPurchaseOrderQuantity", width: 13 },
    { header: "Net qty", key: "netRecommendedQuantity", width: 13 }, { header: "Unit", key: "unit", width: 10 },
    { header: "Supplier", key: "preferredSupplierName", width: 24 }, { header: "Unit cost", key: "estimatedUnitCost", width: 13 },
    { header: "Purchase value", key: "estimatedPurchaseValue", width: 16 }, { header: "Confidence", key: "confidenceScore", width: 12 },
    { header: "Flags", key: "flags", width: 34 },
  ];
  report.recommendations.forEach((row) => sheet.addRow({ ...row, flags: row.flags.join(", ") }));
  sheet.getRow(1).font = { bold: true };
  sheet.autoFilter = { from: "A1", to: "Q1" };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const suppliers = workbook.addWorksheet("Supplier Plan");
  suppliers.columns = [
    { header: "Supplier", key: "supplierName", width: 28 }, { header: "Items", key: "items", width: 10 },
    { header: "Quantity", key: "quantity", width: 14 }, { header: "Estimated value", key: "estimatedValue", width: 18 },
    { header: "Critical items", key: "criticalItems", width: 15 },
  ];
  report.suppliers.forEach((row) => suppliers.addRow(row));
  suppliers.getRow(1).font = { bold: true };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function procurementIntelligenceToPdf(report: ProcurementIntelligenceResult) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  let y = 800;
  const line = (text: string, size = 9, strong = false) => {
    if (y < 55) { page = pdf.addPage([595, 842]); y = 800; }
    page.drawText(text.slice(0, 105), { x: 40, y, size, font: strong ? bold : font, color: rgb(0.08, 0.17, 0.24) });
    y -= size + 7;
  };
  line("TRS Inventory Demand & Procurement Intelligence", 17, true);
  line(`Generated: ${new Date(report.generatedAt).toLocaleString("en-IN")}`);
  line(`Net recommended purchase: INR ${report.kpis.netRecommendedValue.toFixed(0)} | Critical items: ${report.kpis.criticalItems}`, 11, true);
  line(`Inventory health: ${report.kpis.inventoryHealthScore}/100 | Stockout <= 7 days: ${report.kpis.stockoutWithin7Days}`);
  y -= 8;
  line("Priority Purchase Plan", 12, true);
  report.recommendations.filter((row) => row.netRecommendedQuantity > 0).slice(0, 60).forEach((row) => {
    line(`${row.priority.toUpperCase()} | ${row.itemName} | ${row.netRecommendedQuantity} ${row.unit} | ${row.preferredSupplierName} | INR ${row.estimatedPurchaseValue.toFixed(0)} | buy by ${row.recommendedPurchaseDate}`, 8);
  });
  y -= 8;
  line("Operational Alerts", 12, true);
  report.alerts.forEach((alert) => line(`${alert.severity.toUpperCase()}: ${alert.title} - ${alert.message}`, 8));
  return Buffer.from(await pdf.save());
}
