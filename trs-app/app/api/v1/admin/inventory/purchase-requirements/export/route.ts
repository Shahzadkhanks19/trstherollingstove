import ExcelJS from "exceljs";

import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { InventoryItem } from "@/models/InventoryItem";
import { createPurchaseRequirementsPdf } from "@/services/inventory-stock-planning-pdf.service";

export const dynamic = "force-dynamic";

type RequirementRow = {
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

export async function GET(request: Request) {
  try {
    await requirePermission("inventory.read");
    await connectToDatabase();

    const format = new URL(request.url).searchParams.get("format") ?? "xlsx";
    if (format !== "xlsx" && format !== "pdf") {
      throw new AppError("Export format must be xlsx or pdf.", 400);
    }

    const items = await InventoryItem.find({ isActive: true })
      .sort({ category: 1, name: 1 })
      .lean();

    const requirements: RequirementRow[] = items.flatMap((item) => {
      const targetStock = Math.max(item.idealStockLevel ?? 0, item.reorderLevel ?? 0);
      const suggestedQuantity = Math.max(
        0,
        Number((targetStock - item.currentStock).toFixed(3)),
      );

      if (suggestedQuantity <= 0) return [];

      const priority =
        item.currentStock <= 0
          ? "critical"
          : item.currentStock <= item.reorderLevel
            ? "high"
            : "medium";

      return [{
        name: item.name,
        sku: item.sku,
        category: item.category,
        unit: item.unit,
        currentStock: item.currentStock,
        reorderLevel: item.reorderLevel,
        targetStock,
        suggestedQuantity,
        averageUnitCost: item.averageUnitCost,
        estimatedValue: Number((suggestedQuantity * item.averageUnitCost).toFixed(2)),
        priority,
      }];
    });

    const date = new Date().toISOString().slice(0, 10);

    if (format === "pdf") {
      const bytes = await createPurchaseRequirementsPdf(requirements);
      return new Response(bytes as BodyInit, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="trs-purchase-requirements-${date}.pdf"`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Purchase Requirements");
    sheet.columns = [
      { header: "Item", key: "item", width: 28 },
      { header: "SKU", key: "sku", width: 16 },
      { header: "Category", key: "category", width: 20 },
      { header: "Unit", key: "unit", width: 10 },
      { header: "Current", key: "current", width: 12 },
      { header: "Reorder", key: "reorder", width: 12 },
      { header: "Target", key: "target", width: 12 },
      { header: "Suggested Order", key: "suggested", width: 16 },
      { header: "Unit Cost", key: "cost", width: 12 },
      { header: "Estimated Value", key: "value", width: 16 },
      { header: "Priority", key: "priority", width: 12 },
    ];

    for (const row of requirements) {
      sheet.addRow({
        item: row.name,
        sku: row.sku,
        category: row.category,
        unit: row.unit,
        current: row.currentStock,
        reorder: row.reorderLevel,
        target: row.targetStock,
        suggested: row.suggestedQuantity,
        cost: row.averageUnitCost,
        value: row.estimatedValue,
        priority: row.priority,
      });
    }

    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="trs-purchase-requirements-${date}.xlsx"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
