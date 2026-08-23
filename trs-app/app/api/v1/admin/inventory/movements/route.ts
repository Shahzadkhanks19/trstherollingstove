import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { assertDateRange, parseDateParameter } from "@/lib/date-range";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { InventoryMovement } from "@/models/InventoryMovement";
import { recordInventoryMovement } from "@/services/inventory.service";
import { createInventoryMovementSchema } from "@/validators/inventory";

export async function GET(request: Request) {
  try {
    await requirePermission("inventory.read");
    await connectToDatabase();

    const url = new URL(request.url);
    const inventoryItemId =
      url.searchParams.get("inventoryItemId");
    const type = url.searchParams.get("type");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const filter: Record<string, unknown> = {};

    if (inventoryItemId) {
      filter.inventoryItemId = inventoryItemId;
    }

    if (type) {
      filter.type = type;
    }

    if (from || to) {
      const createdAt: Record<string, Date> = {};

      if (from) createdAt.$gte = parseDateParameter(from, "From date");
      if (to) createdAt.$lte = parseDateParameter(to, "To date");
      if (createdAt.$gte && createdAt.$lte) assertDateRange(createdAt.$gte, createdAt.$lte);
      filter.createdAt = createdAt;
    }

    const movements =
      await InventoryMovement.find(filter)
        .populate(
          "inventoryItemId",
          "name sku unit",
        )
        .populate("performedBy", "name email")
        .sort({ createdAt: -1 })
        .limit(500)
        .lean();

    return successResponse(movements);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission(
      "inventory.manage",
    );
    const input = await validateRequestBody(
      request,
      createInventoryMovementSchema,
    );

    await connectToDatabase();

    const movement = await recordInventoryMovement({
      ...input,
      actorId: actor.id,
    });

    return successResponse(
      movement,
      "Inventory movement recorded.",
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
