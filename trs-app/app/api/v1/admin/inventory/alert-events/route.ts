import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { InventoryAlertEvent } from "@/models/InventoryAlertEvent";

export async function GET(request: Request) {
  try {
    await requirePermission("inventory.read");
    await connectToDatabase();

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const type = url.searchParams.get("type");
    const severity = url.searchParams.get("severity");
    const limit = Math.min(
      Math.max(Number(url.searchParams.get("limit")) || 100, 1),
      500,
    );
    const filter: Record<string, unknown> = {};

    if (status) filter.status = status;
    if (type) filter.type = type;
    if (severity) filter.severity = severity;

    const events = await InventoryAlertEvent.find(filter)
      .populate("ruleId", "name type")
      .populate("inventoryItemId", "name sku unit currentStock")
      .sort({ status: 1, severity: -1, lastDetectedAt: -1 })
      .limit(limit)
      .lean();

    return successResponse(events);
  } catch (error) {
    return handleApiError(error);
  }
}
