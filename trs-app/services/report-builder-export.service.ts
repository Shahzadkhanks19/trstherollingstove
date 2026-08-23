import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ReportPreviewResult } from "@/types/report-builder";

function display(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
function csvCell(value: unknown): string { return `"${display(value).replaceAll('"', '""')}"`; }
function safeName(name: string): string { return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "report"; }

export function createReportCsv(result: ReportPreviewResult): Buffer {
  const lines = [result.columns.map((column) => csvCell(column.label)).join(",")];
  for (const row of result.rows) lines.push(result.columns.map((column) => csvCell(row[column.key])).join(","));
  return Buffer.from(`\uFEFF${lines.join("\n")}`, "utf8");
}

export async function createReportWorkbook(title: string, result: ReportPreviewResult): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "The Rolling Stove";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Report");
  sheet.addRow([title]); sheet.mergeCells(1, 1, 1, Math.max(result.columns.length, 1));
  sheet.getRow(1).font = { bold: true, size: 16 };
  sheet.addRow([`Generated: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`]);
  sheet.mergeCells(2, 1, 2, Math.max(result.columns.length, 1));
  sheet.addRow(result.columns.map((column) => column.label));
  sheet.getRow(3).font = { bold: true };
  for (const row of result.rows) sheet.addRow(result.columns.map((column) => row[column.key] ?? ""));
  sheet.columns.forEach((column) => { column.width = Math.min(35, Math.max(12, ...((column.values ?? []).map((value) => display(value).length + 2)))); });
  const bytes = await workbook.xlsx.writeBuffer();
  return Buffer.from(bytes);
}

export async function createReportPdf(title: string, result: ReportPreviewResult): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const width = 842; const height = 595; const margin = 32; const rowHeight = 15;
  const columns = result.columns.slice(0, 8);
  const columnWidth = (width - margin * 2) / Math.max(columns.length, 1);
  let page = pdf.addPage([width, height]); let y = height - margin;
  const header = () => {
    page.drawText("THE ROLLING STOVE", { x: margin, y, size: 15, font: bold, color: rgb(0.08, 0.09, 0.11) });
    y -= 22; page.drawText(title.slice(0, 90), { x: margin, y, size: 12, font: bold });
    y -= 18; page.drawText(`Generated ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`, { x: margin, y, size: 8, font: regular, color: rgb(0.35, 0.35, 0.35) });
    y -= 22;
    columns.forEach((column, index) => page.drawText(column.label.slice(0, 18), { x: margin + index * columnWidth, y, size: 7, font: bold }));
    y -= rowHeight;
  };
  header();
  for (const row of result.rows) {
    if (y < margin + rowHeight) { page = pdf.addPage([width, height]); y = height - margin; header(); }
    columns.forEach((column, index) => page.drawText(display(row[column.key]).slice(0, 22), { x: margin + index * columnWidth, y, size: 6.5, font: regular }));
    y -= rowHeight;
  }
  return Buffer.from(await pdf.save());
}

export function reportExportFilename(name: string, format: "csv" | "xlsx" | "pdf"): string {
  return `${safeName(name)}-${new Date().toISOString().slice(0, 10)}.${format}`;
}
