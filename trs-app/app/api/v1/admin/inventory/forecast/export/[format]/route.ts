import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { InventoryForecastSnapshot } from "@/models/InventoryForecastSnapshot";
import {
  createInventoryReportPdf,
  createInventoryReportWorkbook,
} from "@/services/inventory-report-export.service";
import {
  getLatestForecastRun,
} from "@/services/inventory-forecast.service";
import {
  recordInventoryAudit,
} from "@/services/inventory-enterprise-events.service";

type Context = {
  params: Promise<{ format: string }>;
};

export async function GET(
  request: Request,
  context: Context,
) {
  try {
    const actor = await requirePermission("reports.read");
    const { format } = await context.params;

    if (format !== "xlsx" && format !== "pdf") {
      throw new AppError(
        "Forecast export format must be xlsx or pdf.",
        400,
      );
    }

    const url = new URL(request.url);
    const requestedRunId =
      url.searchParams.get("runId");
    await connectToDatabase();

    const run = requestedRunId
      ? { _id: requestedRunId }
      : await getLatestForecastRun();

    if (!run) {
      throw new AppError(
        "Generate an inventory forecast before exporting.",
        404,
      );
    }

    const snapshots =
      await InventoryForecastSnapshot.find({
        runId: run._id,
      })
        .sort({
          recommendedOrderValue: -1,
          daysUntilStockout: 1,
        })
        .lean();

    const rows = snapshots.map((row) => ({
      item: row.itemName,
      sku: row.sku,
      category: row.category,
      unit: row.unit,
      currentStock: row.currentStock,
      averageDailyDemand: row.averageDailyDemand,
      forecastDailyDemand: row.forecastDailyDemand,
      forecastWeeklyDemand: row.forecastWeeklyDemand,
      forecastMonthlyDemand: row.forecastMonthlyDemand,
      trendPercent: row.trendPercent,
      safetyStock: row.safetyStock,
      reorderPoint: row.reorderPoint,
      recommendedOrderQuantity:
        row.recommendedOrderQuantity,
      recommendedOrderValue:
        row.recommendedOrderValue,
      daysUntilStockout: row.daysUntilStockout,
      expectedStockoutDate:
        row.expectedStockoutDate,
      confidenceScore: row.confidenceScore,
      riskLevel: row.riskLevel,
      velocityClass: row.velocityClass,
    }));

    const title =
      "Inventory Demand Forecast & Reorder Recommendations";
    const bytes =
      format === "xlsx"
        ? await createInventoryReportWorkbook({
            title,
            reportType: "inventory_forecast",
            rows,
          })
        : await createInventoryReportPdf({
            title,
            reportType: "inventory_forecast",
            rows,
          });

    await recordInventoryAudit({
      actorUserId: actor.id,
      action: "inventory.forecast_exported",
      entityType: "InventoryForecastRun",
      entityId: String(run._id),
      description: `Inventory forecast exported as ${format.toUpperCase()}.`,
      metadata: {
        format,
        rowCount: rows.length,
      },
    });

    return new Response(bytes as BodyInit, {
      headers: {
        "content-type":
          format === "xlsx"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "application/pdf",
        "content-disposition": `attachment; filename="inventory-forecast.${format}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
