import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { InternalConsumptionAnalytics } from "@/services/internal-consumption-analytics.service";

export async function internalConsumptionAnalyticsToXlsx(report: InternalConsumptionAnalytics): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "The Rolling Stove ERP";
  workbook.created = new Date();
  const summary = workbook.addWorksheet("Summary");
  summary.columns = [{ header: "Metric", key: "metric", width: 30 }, { header: "Value", key: "value", width: 24 }];
  summary.addRows([
    { metric: "From", value: report.range.from }, { metric: "To", value: report.range.to },
    { metric: "Order type", value: report.range.saleType }, { metric: "Orders", value: report.totals.orders },
    { metric: "Items", value: report.totals.items }, { metric: "Menu value", value: report.totals.menuValue },
    { metric: "Average order value", value: report.totals.averageOrderValue }, { metric: "Unique people", value: report.totals.uniquePeople },
    { metric: "Inventory cost", value: report.totals.inventoryCost }, { metric: "Cost coverage %", value: report.totals.costCoveragePercent },
  ]);
  summary.getRow(1).font = { bold: true };

  const addSheet = (name: string, columns: ExcelJS.Column[], rows: Record<string, unknown>[]) => {
    const sheet = workbook.addWorksheet(name);
    sheet.columns = columns;
    sheet.addRows(rows);
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    return sheet;
  };
  addSheet("By Type", [
    { header: "Type", key: "saleType", width: 22 }, { header: "Orders", key: "orders", width: 12 },
    { header: "Items", key: "items", width: 12 }, { header: "Menu Value", key: "menuValue", width: 16 }, { header: "Inventory Cost", key: "inventoryCost", width: 16 },
  ] as ExcelJS.Column[], report.byType);
  addSheet("Daily Trend", [
    { header: "Date", key: "date", width: 15 }, { header: "Orders", key: "orders", width: 12 },
    { header: "Items", key: "items", width: 12 }, { header: "Menu Value", key: "menuValue", width: 16 }, { header: "Inventory Cost", key: "inventoryCost", width: 16 },
  ] as ExcelJS.Column[], report.dailyTrend);
  addSheet("Employee-People", [
    { header: "Name", key: "name", width: 30 }, { header: "Type", key: "saleType", width: 22 },
    { header: "Orders", key: "orders", width: 12 }, { header: "Menu Value", key: "menuValue", width: 16 },
  ] as ExcelJS.Column[], report.topPeople);
  addSheet("Top Items", [
    { header: "Item", key: "name", width: 30 }, { header: "Variant", key: "variantName", width: 20 },
    { header: "Quantity", key: "quantity", width: 12 }, { header: "Menu Value", key: "menuValue", width: 16 },
  ] as ExcelJS.Column[], report.topItems);
  addSheet("Reasons", [
    { header: "Reason", key: "reason", width: 35 }, { header: "Type", key: "saleType", width: 22 },
    { header: "Orders", key: "orders", width: 12 }, { header: "Menu Value", key: "menuValue", width: 16 },
  ] as ExcelJS.Column[], report.topReasons);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function internalConsumptionAnalyticsToPdf(report: InternalConsumptionAnalytics): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  let y = 800;
  const line = (text: string, size = 10, isBold = false) => {
    if (y < 55) { page = pdf.addPage([595, 842]); y = 800; }
    page.drawText(text.replace(/[₹]/g, "INR "), { x: 45, y, size, font: isBold ? bold : font, color: rgb(0.08, 0.18, 0.25) });
    y -= size + 7;
  };
  line("THE ROLLING STOVE", 18, true);
  line("Internal Consumption Financial Report", 14, true);
  line(`${report.range.from.slice(0, 10)} to ${report.range.to.slice(0, 10)} | ${report.range.saleType}`, 9);
  y -= 8;
  line(`Orders: ${report.totals.orders}`, 11, true);
  line(`Items: ${report.totals.items}`);
  line(`Menu value consumed: INR ${report.totals.menuValue.toFixed(2)}`);
  line(`Average order value: INR ${report.totals.averageOrderValue.toFixed(2)}`);
  line(`Inventory cost: INR ${report.totals.inventoryCost.toFixed(2)} (${report.totals.costCoveragePercent}% of menu value)`);
  line(`Unique people: ${report.totals.uniquePeople}`);
  y -= 8;
  line("BREAKDOWN BY TYPE", 12, true);
  report.byType.forEach((row) => line(`${row.saleType}: ${row.orders} orders | ${row.items} items | Menu INR ${row.menuValue.toFixed(2)} | Cost INR ${row.inventoryCost.toFixed(2)}`));
  y -= 8;
  line("EMPLOYEE / RECIPIENT REPORT", 12, true);
  report.topPeople.forEach((row, index) => line(`${index + 1}. ${row.name} (${row.saleType}) - ${row.orders} orders - INR ${row.menuValue.toFixed(2)}`));
  y -= 8;
  line("TOP ITEMS", 12, true);
  report.topItems.forEach((row, index) => line(`${index + 1}. ${row.name}${row.variantName ? ` / ${row.variantName}` : ""} - Qty ${row.quantity} - INR ${row.menuValue.toFixed(2)}`));
  y -= 8;
  line("TOP REASONS", 12, true);
  report.topReasons.forEach((row, index) => line(`${index + 1}. ${row.reason} (${row.saleType}) - ${row.orders} orders - INR ${row.menuValue.toFixed(2)}`));
  return Buffer.from(await pdf.save());
}
