import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import {
  generateCachedInventoryReport,
} from "@/services/inventory-report-cache.service";
import {
  createInventoryReportPdf,
  createInventoryReportWorkbook,
} from "@/services/inventory-report-export.service";
import {
  publishInventoryEnterpriseEvent,
  recordInventoryAudit,
} from "@/services/inventory-enterprise-events.service";
import type {
  InventoryReportFilters,
  InventoryReportType,
} from "@/services/inventory-report.service";

const TYPES: InventoryReportType[] = [
  "valuation",
  "consumption",
  "expiry",
  "abc_analysis",
  "stock_ledger",
];

type Context = {
  params: Promise<{ format: string }>;
};

function parseDate(value: string | null) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function GET(
  request: Request,
  context: Context,
) {
  try {
    const actor = await requirePermission("reports.read");
    const { format } = await context.params;

    if (format !== "xlsx" && format !== "pdf") {
      throw new AppError(
        "Export format must be xlsx or pdf.",
        400,
      );
    }

    const url = new URL(request.url);
    const reportType = url.searchParams.get(
      "type",
    ) as InventoryReportType | null;

    if (!reportType || !TYPES.includes(reportType)) {
      throw new AppError(
        "A valid inventory report type is required.",
        400,
      );
    }

    const filters: InventoryReportFilters = {
      from: parseDate(url.searchParams.get("from")),
      to: parseDate(url.searchParams.get("to")),
      inventoryItemId:
        url.searchParams.get("inventoryItemId") ??
        undefined,
      search: url.searchParams.get("search") ?? undefined,
      limit: Math.min(
        Number(url.searchParams.get("limit") ?? 5000),
        10_000,
      ),
    };

    await connectToDatabase();

    const report = await generateCachedInventoryReport({
      reportType,
      filters,
      generatedBy: actor.id,
      force: url.searchParams.get("force") === "true",
    });

    const title = `Inventory ${reportType.replace(/_/g, " ")} report`;
    const bytes =
      format === "xlsx"
        ? await createInventoryReportWorkbook({
            title,
            reportType,
            rows: report.rows,
            filters,
            generatedAt: report.generatedAt,
          })
        : await createInventoryReportPdf({
            title,
            reportType,
            rows: report.rows,
            filters,
            generatedAt: report.generatedAt,
          });

    await recordInventoryAudit({
      actorUserId: actor.id,
      action: "inventory.report_exported",
      entityType: "InventoryReport",
      entityId: report.cacheKey,
      description: `${title} exported as ${format.toUpperCase()}.`,
      metadata: {
        reportType,
        format,
        rowCount: report.rows.length,
        cached: report.cached,
      },
    });

    publishInventoryEnterpriseEvent({
      event: "inventory.report_completed",
      entityId: report.cacheKey,
      data: {
        reportType,
        format,
        rowCount: report.rows.length,
        cached: report.cached,
      },
    });

    const fileName = `inventory-${reportType}-${new Date()
      .toISOString()
      .slice(0, 10)}.${format}`;

    return new Response(bytes as BodyInit, {
      headers: {
        "content-type":
          format === "xlsx"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "application/pdf",
        "content-disposition": `attachment; filename="${fileName}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
