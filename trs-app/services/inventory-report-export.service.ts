import ExcelJS from "exceljs";
import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "pdf-lib";

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function columnsForRows(
  rows: Array<Record<string, unknown>>,
) {
  const columns = new Set<string>();

  for (const row of rows) {
    for (const key of Object.keys(row)) columns.add(key);
  }

  return Array.from(columns);
}

export async function createInventoryReportWorkbook(input: {
  title: string;
  reportType: string;
  rows: Array<Record<string, unknown>>;
  filters?: Record<string, unknown>;
  generatedAt?: Date;
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "The Rolling Stove";
  workbook.created = input.generatedAt ?? new Date();

  const summary = workbook.addWorksheet("Report Summary");
  summary.columns = [
    { header: "Field", key: "field", width: 28 },
    { header: "Value", key: "value", width: 60 },
  ];
  summary.addRows([
    { field: "Report", value: input.title },
    { field: "Report Type", value: input.reportType },
    {
      field: "Generated At",
      value: (input.generatedAt ?? new Date()).toISOString(),
    },
    { field: "Row Count", value: input.rows.length },
    {
      field: "Filters",
      value: JSON.stringify(input.filters ?? {}),
    },
  ]);
  summary.getRow(1).font = { bold: true };
  summary.views = [{ state: "frozen", ySplit: 1 }];
  summary.autoFilter = "A1:B1";

  const data = workbook.addWorksheet("Inventory Data");
  const keys = columnsForRows(input.rows);
  data.columns = keys.map((key) => ({
    header: key
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (character) =>
        character.toUpperCase(),
      ),
    key,
    width: Math.max(14, Math.min(36, key.length + 8)),
  }));

  for (const row of input.rows) {
    data.addRow(
      Object.fromEntries(
        keys.map((key) => [key, displayValue(row[key])]),
      ),
    );
  }

  data.getRow(1).font = { bold: true };
  data.views = [{ state: "frozen", ySplit: 1 }];
  if (keys.length) {
    data.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: keys.length },
    };
  }

  return workbook.xlsx.writeBuffer();
}

function truncate(value: string, length: number) {
  return value.length <= length
    ? value
    : `${value.slice(0, length - 1)}…`;
}

export async function createInventoryReportPdf(input: {
  title: string;
  reportType: string;
  rows: Array<Record<string, unknown>>;
  filters?: Record<string, unknown>;
  generatedAt?: Date;
}) {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(
    StandardFonts.Helvetica,
  );
  const bold = await document.embedFont(
    StandardFonts.HelveticaBold,
  );
  const pageSize: [number, number] = [842, 595];
  const margin = 36;
  const columns = columnsForRows(input.rows).slice(0, 7);
  const usableWidth = pageSize[0] - margin * 2;
  const columnWidth =
    columns.length > 0
      ? usableWidth / columns.length
      : usableWidth;
  const rowHeight = 18;

  let page = document.addPage(pageSize);
  let y = pageSize[1] - margin;

  const newPage = () => {
    page = document.addPage(pageSize);
    y = pageSize[1] - margin;
  };

  const drawHeader = () => {
    page.drawText("THE ROLLING STOVE", {
      x: margin,
      y,
      size: 11,
      font: bold,
      color: rgb(0.55, 0.08, 0.08),
    });
    page.drawText(input.title, {
      x: margin,
      y: y - 24,
      size: 18,
      font: bold,
    });
    page.drawText(
      `Type: ${input.reportType}  |  Generated: ${(input.generatedAt ?? new Date()).toISOString()}  |  Rows: ${input.rows.length}`,
      {
        x: margin,
        y: y - 43,
        size: 8,
        font: regular,
      },
    );
    y -= 68;

    columns.forEach((column, index) => {
      page.drawText(
        truncate(
          column
            .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
            .replace(/_/g, " "),
          18,
        ),
        {
          x: margin + index * columnWidth + 3,
          y,
          size: 7,
          font: bold,
        },
      );
    });
    y -= rowHeight;
  };

  drawHeader();

  for (const row of input.rows) {
    if (y < margin + 28) {
      newPage();
      drawHeader();
    }

    columns.forEach((column, index) => {
      page.drawText(
        truncate(displayValue(row[column]), 24),
        {
          x: margin + index * columnWidth + 3,
          y,
          size: 6.5,
          font: regular,
        },
      );
    });

    page.drawLine({
      start: { x: margin, y: y - 4 },
      end: {
        x: pageSize[0] - margin,
        y: y - 4,
      },
      thickness: 0.25,
      color: rgb(0.82, 0.82, 0.82),
    });
    y -= rowHeight;
  }

  const pages = document.getPages();
  pages.forEach((currentPage, index) => {
    currentPage.drawText(
      `Page ${index + 1} of ${pages.length}`,
      {
        x: pageSize[0] - 110,
        y: 18,
        size: 7,
        font: regular,
      },
    );
  });

  return document.save();
}
