import ExcelJS from "exceljs";

import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { resolveDashboardDateRange } from "@/lib/dashboard/dateRange";
import { handleApiError } from "@/lib/errors/handleApiError";
import { getSalesAnalytics } from "@/services/sales-analytics.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requirePermission("reports.read");
    await connectToDatabase();

    const url = new URL(request.url);
    const from = url.searchParams.get("from") ?? undefined;
    const to = url.searchParams.get("to") ?? undefined;
    const data = await getSalesAnalytics(resolveDashboardDateRange(from, to));

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sales");
    sheet.columns = [
      { header: "Date", key: "date", width: 22 },
      { header: "Order", key: "order", width: 22 },
      { header: "Customer", key: "customer", width: 24 },
      { header: "Type", key: "type", width: 14 },
      { header: "Items", key: "items", width: 10 },
      { header: "Payment", key: "payment", width: 20 },
      { header: "Gross", key: "gross", width: 14 },
      { header: "Discount", key: "discount", width: 14 },
      { header: "Tax", key: "tax", width: 12 },
      { header: "Refund", key: "refund", width: 12 },
      { header: "Net", key: "net", width: 14 },
      { header: "Cashier", key: "cashier", width: 20 },
      { header: "Status", key: "status", width: 14 },
    ];

    for (const row of data.details) {
      sheet.addRow({
        date: new Date(row.createdAt).toLocaleString("en-IN"),
        order: row.orderNumber,
        customer: row.customer,
        type: row.orderMode,
        items: row.itemCount,
        payment: row.paymentBreakdown?.length
          ? [...new Set(row.paymentBreakdown.map((part: { method: string; amount: number }) => part.method.toUpperCase()))].join(" + ")
          : row.paymentMethod.toUpperCase(),
        gross: row.gross,
        discount: row.discount,
        tax: row.tax,
        refund: row.refund,
        net: row.net,
        cashier: row.cashier,
        status: row.paymentStatus,
      });
    }

    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `trs-sales-${from ?? "range"}-to-${to ?? "today"}.xlsx`;

    return new Response(buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}