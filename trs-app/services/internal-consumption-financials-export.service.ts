import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { InternalConsumptionFinancialReport } from "@/services/internal-consumption-financials.service";

const cell = (value: string | number) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export function internalConsumptionFinancialsToCsv(report: InternalConsumptionFinancialReport): string {
  const rows: Array<Array<string | number>> = [
    ["TRS Financial Reporting"],
    ["From", report.range.from],
    ["To", report.range.to],
    ["Generated", report.generatedAt],
    [],
    ["Profit & Loss"],
    ["Line", "Type", "Amount"],
    ...report.profitAndLoss.map((row) => [row.label, row.kind, row.amount]),
    [],
    ["Financial KPIs"],
    ...Object.entries(report.kpis).map(([key, value]) => [key, value]),
    [],
    ["Discount Analysis"],
    ...Object.entries(report.discounts).map(([key, value]) => [key, value]),
    [],
    ["GST Summary"],
    ...Object.entries(report.gst).map(([key, value]) => [key, value]),
    [],
    ["Internal Consumption By Type"],
    ["Type", "Orders", "Menu Value", "Inventory Cost"],
    ...report.internalConsumption.byType.map((row) => [row.saleType, row.orders, row.menuValue, row.inventoryCost]),
    [],
    ["Daily Revenue Trend"],
    ["Date", "Gross Sales", "Net Revenue", "Tax", "COGS", "Gross Profit"],
    ...report.revenueTrend.map((row) => [row.date, row.grossSales, row.netRevenue, row.tax, row.cogs, row.grossProfit]),
    [],
    ["Expense Breakdown"],
    ["Category", "Amount", "Tax", "Count"],
    ...report.expenseBreakdown.map((row) => [row.category, row.amount, row.tax, row.count]),
  ];
  return `\uFEFF${rows.map((row) => row.map(cell).join(",")).join("\n")}`;
}

export async function internalConsumptionFinancialsToXlsx(report: InternalConsumptionFinancialReport): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "The Rolling Stove ERP";
  workbook.created = new Date();

  const addSheet = (name: string, columns: ExcelJS.Column[], rows: Record<string, unknown>[]) => {
    const sheet = workbook.addWorksheet(name);
    sheet.columns = columns;
    sheet.addRows(rows);
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    return sheet;
  };

  addSheet(
    "Profit and Loss",
    [
      { header: "Line", key: "label", width: 38 },
      { header: "Type", key: "kind", width: 16 },
      { header: "Amount", key: "amount", width: 18 },
    ] as ExcelJS.Column[],
    report.profitAndLoss,
  );

  addSheet(
    "KPIs",
    [
      { header: "Metric", key: "metric", width: 34 },
      { header: "Value", key: "value", width: 20 },
    ] as ExcelJS.Column[],
    [
      { metric: "From", value: report.range.from },
      { metric: "To", value: report.range.to },
      ...Object.entries(report.kpis).map(([metric, value]) => ({ metric, value })),
      ...Object.entries(report.dataQuality).map(([metric, value]) => ({ metric: `dataQuality.${metric}`, value })),
    ],
  );

  addSheet(
    "Discounts",
    [
      { header: "Discount Type", key: "metric", width: 28 },
      { header: "Amount", key: "value", width: 18 },
    ] as ExcelJS.Column[],
    Object.entries(report.discounts).map(([metric, value]) => ({ metric, value })),
  );

  addSheet(
    "GST",
    [
      { header: "Metric", key: "metric", width: 30 },
      { header: "Value", key: "value", width: 18 },
    ] as ExcelJS.Column[],
    Object.entries(report.gst).map(([metric, value]) => ({ metric, value })),
  );

  addSheet(
    "Internal Consumption",
    [
      { header: "Type", key: "saleType", width: 24 },
      { header: "Orders", key: "orders", width: 12 },
      { header: "Menu Value", key: "menuValue", width: 18 },
      { header: "Inventory Cost", key: "inventoryCost", width: 18 },
    ] as ExcelJS.Column[],
    report.internalConsumption.byType,
  );

  addSheet(
    "Revenue Trend",
    [
      { header: "Date", key: "date", width: 15 },
      { header: "Gross Sales", key: "grossSales", width: 16 },
      { header: "Net Revenue", key: "netRevenue", width: 16 },
      { header: "Tax", key: "tax", width: 14 },
      { header: "COGS", key: "cogs", width: 14 },
      { header: "Gross Profit", key: "grossProfit", width: 16 },
    ] as ExcelJS.Column[],
    report.revenueTrend,
  );

  addSheet(
    "Expenses",
    [
      { header: "Category", key: "category", width: 24 },
      { header: "Amount", key: "amount", width: 18 },
      { header: "Tax", key: "tax", width: 14 },
      { header: "Count", key: "count", width: 12 },
    ] as ExcelJS.Column[],
    report.expenseBreakdown,
  );

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function internalConsumptionFinancialsToPdf(report: InternalConsumptionFinancialReport): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  let y = 800;

  const line = (text: string, size = 10, isBold = false) => {
    if (y < 55) {
      page = pdf.addPage([595, 842]);
      y = 800;
    }
    page.drawText(text.replace(/[₹]/g, "INR "), {
      x: 42,
      y,
      size,
      font: isBold ? bold : regular,
      color: rgb(0.08, 0.18, 0.25),
      maxWidth: 510,
    });
    y -= size + 7;
  };

  line("THE ROLLING STOVE", 18, true);
  line("Financial Statements & Internal Consumption Report", 13, true);
  line(`${report.range.from.slice(0, 10)} to ${report.range.to.slice(0, 10)}`, 9);
  y -= 8;

  line("PROFIT & LOSS", 12, true);
  for (const row of report.profitAndLoss) {
    line(`${row.label}: INR ${row.amount.toFixed(2)}${row.kind === "subtotal" ? "" : ` (${row.kind})`}`, 10, row.kind === "subtotal");
  }

  y -= 8;
  line("KEY RATIOS", 12, true);
  line(`Gross margin: ${report.kpis.grossMarginPercent.toFixed(2)}%`);
  line(`Food cost: ${report.kpis.foodCostPercent.toFixed(2)}%`);
  line(`Internal consumption / revenue: ${report.kpis.internalConsumptionPercent.toFixed(2)}%`);
  line(`Average order value: INR ${report.kpis.averageOrderValue.toFixed(2)}`);

  y -= 8;
  line("DISCOUNT ANALYSIS", 12, true);
  (Object.entries(report.discounts) as Array<[string, number]>).forEach(([key, value]) => line(`${key}: INR ${value.toFixed(2)}`));

  y -= 8;
  line("GST SUMMARY", 12, true);
  line(`Taxable revenue: INR ${report.gst.taxableRevenue.toFixed(2)}`);
  line(`Output GST: INR ${report.gst.outputTax.toFixed(2)}`);
  line(`Input GST: INR ${report.gst.inputTax.toFixed(2)}`);
  line(`Net GST payable: INR ${report.gst.netTaxPayable.toFixed(2)}`);

  y -= 8;
  line("INTERNAL CONSUMPTION", 12, true);
  line(`Menu value: INR ${report.internalConsumption.menuValue.toFixed(2)}`);
  line(`Inventory cost: INR ${report.internalConsumption.inventoryCost.toFixed(2)}`);
  report.internalConsumption.byType.forEach((row) => {
    line(`${row.saleType}: ${row.orders} orders | INR ${row.inventoryCost.toFixed(2)} cost`);
  });

  y -= 8;
  line("DATA QUALITY", 12, true);
  line(`Cost coverage: ${report.dataQuality.costCoveragePercent.toFixed(2)}%`);
  line(`Customer orders without cost: ${report.dataQuality.customerOrdersWithoutCost}`);
  line(`Internal orders without cost: ${report.dataQuality.internalOrdersWithoutCost}`);

  return Buffer.from(await pdf.save());
}
