import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import {
  getInventoryReportCacheStatistics,
  invalidateInventoryReportCache,
} from "@/services/inventory-report-cache.service";
import {
  publishInventoryEnterpriseEvent,
  recordInventoryAudit,
} from "@/services/inventory-enterprise-events.service";
import type { InventoryReportType } from "@/services/inventory-report.service";

const TYPES: InventoryReportType[] = [
  "valuation",
  "consumption",
  "expiry",
  "abc_analysis",
  "stock_ledger",
];

export async function GET() {
  try {
    await requirePermission("reports.read");
    await connectToDatabase();

    return successResponse(
      await getInventoryReportCacheStatistics(),
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await requirePermission("reports.read");
    const url = new URL(request.url);
    const requestedType = url.searchParams.get("type");
    const reportType =
      requestedType &&
      TYPES.includes(requestedType as InventoryReportType)
        ? (requestedType as InventoryReportType)
        : undefined;

    await connectToDatabase();

    const result =
      await invalidateInventoryReportCache(reportType);

    await recordInventoryAudit({
      actorUserId: actor.id,
      action: "inventory.report_cache_invalidated",
      entityType: "InventoryReportCache",
      entityId: reportType ?? "all",
      description: `Inventory report cache invalidated for ${reportType ?? "all report types"}.`,
      metadata: result,
    });

    publishInventoryEnterpriseEvent({
      event: "inventory.report_cache_invalidated",
      entityId: reportType ?? "all",
      data: result,
    });

    return successResponse(
      result,
      "Inventory report cache invalidated.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
