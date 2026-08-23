import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { BusinessForecastResult } from "@/services/business-forecast.service";

export function businessForecastToCsv(report: BusinessForecastResult) {
  const header = "Date,Revenue,Lower Revenue,Upper Revenue,Orders,Food Cost,Internal Consumption,Wastage,Complimentary";
  const rows = report.forecasts.map((row) => [row.date,row.revenue,row.lowerRevenue,row.upperRevenue,row.orders,row.foodCost,row.internalValue,row.wastageValue,row.complimentaryValue].join(","));
  return [header, ...rows].join("\n");
}
export async function businessForecastToXlsx(report: BusinessForecastResult) {
  const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet("Forecast");
  sheet.columns = [{header:"Date",key:"date",width:14},{header:"Revenue",key:"revenue",width:16},{header:"Lower",key:"lowerRevenue",width:16},{header:"Upper",key:"upperRevenue",width:16},{header:"Orders",key:"orders",width:12},{header:"Food Cost",key:"foodCost",width:16},{header:"Internal",key:"internalValue",width:16},{header:"Wastage",key:"wastageValue",width:14},{header:"Complimentary",key:"complimentaryValue",width:16}];
  report.forecasts.forEach((row) => sheet.addRow(row)); sheet.getRow(1).font = { bold: true };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
export async function businessForecastToPdf(report: BusinessForecastResult) {
  const pdf = await PDFDocument.create(); const font = await pdf.embedFont(StandardFonts.Helvetica); const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595,842]); let y = 800; const line = (text:string,size=9,isBold=false) => { if (y < 50) { page = pdf.addPage([595,842]); y=800; } page.drawText(text,{x:40,y,size,font:isBold?bold:font,color:rgb(.08,.17,.24)}); y -= size+7; };
  line("TRS Business Forecast",18,true); line(`Generated: ${new Date(report.generatedAt).toLocaleString("en-IN")}`,9); line(`Data quality: ${report.quality.score}% (${report.quality.level})`,10,true); y-=8;
  report.horizons.forEach((row)=>line(`${row.days} days: Revenue INR ${row.revenue.toFixed(0)} | Orders ${row.orders} | Food cost INR ${row.foodCost.toFixed(0)} | Range INR ${row.lowerRevenue.toFixed(0)}-${row.upperRevenue.toFixed(0)}`,9)); y-=10;
  line("Next 30 Days",12,true); report.forecasts.slice(0,30).forEach((row)=>line(`${row.date}  Revenue INR ${row.revenue.toFixed(0)}  Orders ${row.orders.toFixed(0)}  Food cost INR ${row.foodCost.toFixed(0)}`,8));
  return Buffer.from(await pdf.save());
}
