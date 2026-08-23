import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { InventoryAlertEvent } from "@/models/InventoryAlertEvent";
import {
  createInventoryReportPdf,
  createInventoryReportWorkbook,
} from "@/services/inventory-report-export.service";
import {
  recordInventoryAudit,
} from "@/services/inventory-enterprise-events.service";

const ALERT_STATUSES = [
  "open",
  "acknowledged",
  "resolved",
] as const;

const ALERT_SEVERITIES = [
  "info",
  "warning",
  "critical",
] as const;

type AlertStatus = (typeof ALERT_STATUSES)[number];
type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

function parseAlertStatus(value: string | null) {
  if (!value) return undefined;

  if (!ALERT_STATUSES.includes(value as AlertStatus)) {
    throw new AppError("Invalid inventory alert status.", 400);
  }

  return value as AlertStatus;
}

function parseAlertSeverity(value: string | null) {
  if (!value) return undefined;

  if (!ALERT_SEVERITIES.includes(value as AlertSeverity)) {
    throw new AppError("Invalid inventory alert severity.", 400);
  }

  return value as AlertSeverity;
}

export async function GET(request: Request) {
  try {
    const actor = await requirePermission("inventory.read");
    const url = new URL(request.url);
    const format =
      url.searchParams.get("format") === "pdf"
        ? "pdf"
        : "xlsx";
    const status = parseAlertStatus(
      url.searchParams.get("status"),
    );
    const severity = parseAlertSeverity(
      url.searchParams.get("severity"),
    );
    const type =
      url.searchParams.get("type")?.trim() || undefined;

    await connectToDatabase();

    const filter: {
      status?: AlertStatus;
      severity?: AlertSeverity;
      type?: string;
    } = {};

    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (type) filter.type = type;

    const events = await InventoryAlertEvent.find(filter)
      .populate("inventoryItemId", "name sku unit")
      .sort({ lastDetectedAt: -1 })
      .limit(10_000)
      .lean();

    const rows = events.map((event) => {
      const item = event.inventoryItemId as unknown as {
        name?: string;
        sku?: string;
        unit?: string;
      };

      return {
        id: String(event._id),
        type: event.type,
        severity: event.severity,
        status: event.status,
        item: item?.name ?? "",
        sku: item?.sku ?? "",
        unit: item?.unit ?? "",
        message: event.message,
        observedValue: event.observedValue,
        thresholdValue: event.thresholdValue,
        occurrenceCount: event.occurrenceCount,
        firstDetectedAt: event.firstDetectedAt,
        lastDetectedAt: event.lastDetectedAt,
        resolutionNote: event.resolutionNote,
      };
    });

    const exportFilters = {
      status: status ?? null,
      severity: severity ?? null,
      type: type ?? null,
    };

    const bytes =
      format === "xlsx"
        ? await createInventoryReportWorkbook({
            title: "Inventory Alert Events",
            reportType: "alert_events",
            rows,
            filters: exportFilters,
          })
        : await createInventoryReportPdf({
            title: "Inventory Alert Events",
            reportType: "alert_events",
            rows,
            filters: exportFilters,
          });

    await recordInventoryAudit({
      actorUserId: actor.id,
      action: "inventory.alerts_exported",
      entityType: "InventoryAlertEvent",
      entityId: "bulk",
      description: `Inventory alerts exported as ${format.toUpperCase()}.`,
      metadata: {
        rowCount: rows.length,
        ...exportFilters,
      },
    });

    return new Response(bytes as BodyInit, {
      headers: {
        "content-type":
          format === "xlsx"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "application/pdf",
        "content-disposition": `attachment; filename="inventory-alerts.${format}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
