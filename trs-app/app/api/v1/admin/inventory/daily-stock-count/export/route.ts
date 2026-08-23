import ExcelJS from "exceljs";

import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { AppError } from "@/lib/errors/AppError";
import { StockCount } from "@/models/StockCount";
import { createDailyStockCountPdf } from "@/services/inventory-stock-planning-pdf.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requirePermission("inventory.read");
    await connectToDatabase();

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const format = url.searchParams.get("format") ?? "xlsx";

    if (!id) throw new AppError("Stock count id is required.", 400);
    if (format !== "xlsx" && format !== "pdf") {
      throw new AppError("Export format must be xlsx or pdf.", 400);
    }

    const count = await StockCount.findById(id)
      .populate("createdBy", "name")
      .populate("postedBy", "name")
      .lean();

    if (!count) throw new AppError("Stock count not found.", 404);

    if (format === "pdf") {
      const createdBy = count.createdBy as { name?: string } | null | undefined;
      const postedBy = count.postedBy as { name?: string } | null | undefined;
      const bytes = await createDailyStockCountPdf({
        countNumber: count.countNumber,
        status: count.status,
        countedAt: count.countedAt,
        notes: count.notes,
        createdByName: createdBy?.name,
        postedByName: postedBy?.name,
        items: count.items.map((line) => ({
          itemName: line.itemName,
          systemQuantity: line.systemQuantity,
          countedQuantity: line.countedQuantity,
          varianceQuantity: line.varianceQuantity,
          unitCost: line.unitCost,
          varianceValue: line.varianceValue,
          reason: line.reason,
        })),
      });

      return new Response(bytes as BodyInit, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${count.countNumber}.pdf"`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Daily Stock Count");
    sheet.columns = [
      { header: "Item", key: "item", width: 28 },
      { header: "System Qty", key: "system", width: 14 },
      { header: "Physical Qty", key: "physical", width: 14 },
      { header: "Variance", key: "variance", width: 12 },
      { header: "Unit Cost", key: "cost", width: 12 },
      { header: "Variance Value", key: "value", width: 16 },
      { header: "Reason / Note", key: "reason", width: 38 },
    ];

    for (const line of count.items) {
      sheet.addRow({
        item: line.itemName,
        system: line.systemQuantity,
        physical: line.countedQuantity,
        variance: line.varianceQuantity,
        cost: line.unitCost,
        value: line.varianceValue,
        reason: line.reason,
      });
    }

    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${count.countNumber}.xlsx"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
