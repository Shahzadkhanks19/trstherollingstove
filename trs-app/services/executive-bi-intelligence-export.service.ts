import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ExecutiveBIIntelligenceResult } from "@/services/executive-bi-intelligence.service";

export function executiveBIIntelligenceToCsv(report: ExecutiveBIIntelligenceResult) {
  const rows = report.actualVsForecast.map((row) => [
    row.date,
    row.kind,
    row.revenue,
    row.lowerRevenue ?? "",
    row.upperRevenue ?? "",
  ].join(","));
  return ["Date,Type,Revenue,Lower Revenue,Upper Revenue", ...rows].join("\n");
}

export async function executiveBIIntelligenceToXlsx(report: ExecutiveBIIntelligenceResult) {
  const workbook = new ExcelJS.Workbook();
  const summary = workbook.addWorksheet("Executive Summary");
  summary.addRows([
    ["Metric", "Value"],
    ["Current revenue", report.summary.currentRevenue],
    ["Revenue change %", report.summary.revenueChangePercent],
    ["30-day forecast revenue", report.summary.forecast30Revenue],
    ["30-day forecast food cost", report.summary.forecast30FoodCost],
    ["Inventory health score", report.summary.inventoryHealthScore],
    ["Forecast quality score", report.summary.forecastQualityScore],
    ["Critical procurement items", report.summary.criticalProcurementItems],
    ["Open alerts", report.summary.totalAlerts],
  ]);
  summary.getRow(1).font = { bold: true };

  const trend = workbook.addWorksheet("Actual vs Forecast");
  trend.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Type", key: "kind", width: 12 },
    { header: "Revenue", key: "revenue", width: 16 },
    { header: "Lower", key: "lowerRevenue", width: 16 },
    { header: "Upper", key: "upperRevenue", width: 16 },
  ];
  report.actualVsForecast.forEach((row) => trend.addRow(row));
  trend.getRow(1).font = { bold: true };

  const alerts = workbook.addWorksheet("Alerts");
  alerts.columns = [
    { header: "Severity", key: "severity", width: 12 },
    { header: "Source", key: "source", width: 14 },
    { header: "Title", key: "title", width: 34 },
    { header: "Message", key: "message", width: 60 },
    { header: "Suggested action", key: "suggestedAction", width: 60 },
  ];
  report.alerts.forEach((alert) => alerts.addRow(alert));
  alerts.getRow(1).font = { bold: true };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function executiveBIIntelligenceToPdf(report: ExecutiveBIIntelligenceResult) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  let y = 800;
  const line = (text: string, size = 9, strong = false) => {
    if (y < 55) { page = pdf.addPage([595, 842]); y = 800; }
    page.drawText(text.slice(0, 105), { x: 40, y, size, font: strong ? bold : font, color: rgb(.08, .17, .24) });
    y -= size + 7;
  };
  line("TRS Unified Executive Business Intelligence", 17, true);
  line(`Generated: ${new Date(report.generatedAt).toLocaleString("en-IN")}`);
  y -= 8;
  line(`Current revenue: INR ${report.summary.currentRevenue.toFixed(0)}`, 11, true);
  line(`30-day forecast: INR ${report.summary.forecast30Revenue.toFixed(0)}`);
  line(`Inventory health: ${report.summary.inventoryHealthScore}/100`);
  line(`Forecast quality: ${report.summary.forecastQualityScore}/100`);
  line(`Critical/high procurement items: ${report.summary.criticalProcurementItems}`);
  y -= 10;
  line("Executive alerts", 12, true);
  report.alerts.slice(0, 20).forEach((alert) => {
    line(`${alert.severity.toUpperCase()} · ${alert.title}`, 9, true);
    line(alert.message, 8);
    line(`Action: ${alert.suggestedAction}`, 8);
    y -= 4;
  });
  return Buffer.from(await pdf.save());
}
