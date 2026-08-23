import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { InventoryAlertEvent } from "@/models/InventoryAlertEvent";
import { inventoryAlertEventActionSchema } from "@/validators/inventory-alerts-reports";
import {
  publishInventoryEnterpriseEvent,
  recordInventoryAudit,
} from "@/services/inventory-enterprise-events.service";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: Request,
  context: Context,
) {
  try {
    const actor = await requirePermission("inventory.manage");
    const { id } = await context.params;
    const input = await validateRequestBody(
      request,
      inventoryAlertEventActionSchema,
    );
    await connectToDatabase();

    const now = new Date();
    const update =
      input.action === "acknowledge"
        ? {
            status: "acknowledged",
            acknowledgedBy: actor.id,
            acknowledgedAt: now,
          }
        : input.action === "resolve"
          ? {
              status: "resolved",
              resolvedBy: actor.id,
              resolvedAt: now,
              resolutionNote: input.note,
            }
          : {
              status: "open",
              acknowledgedBy: null,
              acknowledgedAt: null,
              resolvedBy: null,
              resolvedAt: null,
              resolutionNote: "",
            };

    const event = await InventoryAlertEvent.findByIdAndUpdate(
      id,
      { $set: update },
      { returnDocument: "after" },
    )
      .populate("ruleId", "name type")
      .populate("inventoryItemId", "name sku unit currentStock");

    if (!event) {
      throw new AppError("Inventory alert event not found.", 404);
    }

    await recordInventoryAudit({
      actorUserId: actor.id,
      action: `inventory.alert_${input.action}`,
      entityType: "InventoryAlertEvent",
      entityId: String(event._id),
      description: `Inventory alert ${input.action} action completed.`,
      metadata: {
        status: event.status,
        note: input.note ?? "",
      },
    });

    publishInventoryEnterpriseEvent({
      event: "inventory.alert_updated",
      entityId: String(event._id),
      data: {
        alertEventId: String(event._id),
        action: input.action,
        status: event.status,
        note: input.note ?? "",
      },
    });

    return successResponse(
      event,
      `Inventory alert ${input.action}d.`,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
