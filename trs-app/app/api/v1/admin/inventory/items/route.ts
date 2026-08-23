import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { InventoryItem } from "@/models/InventoryItem";
import { recordInventoryMovement } from "@/services/inventory.service";
import { createInventoryItemSchema } from "@/validators/inventory";

export async function GET(request: Request) {
  try {
    await requirePermission("inventory.read");
    await connectToDatabase();

    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim();
    const category =
      url.searchParams.get("category")?.trim();
    const lowStock =
      url.searchParams.get("lowStock") === "true";
    const includeArchived =
      url.searchParams.get("includeArchived") === "true";

    const filter: Record<string, unknown> = includeArchived
      ? {}
      : { isActive: true };

    if (search) {
      filter.$or = [
        {
          name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          sku: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    if (category) {
      filter.category = category;
    }

    if (lowStock) {
      filter.$expr = {
        $lte: ["$currentStock", "$reorderLevel"],
      };
    }

    const items = await InventoryItem.find(filter)
      .sort({ category: 1, name: 1 })
      .lean();

    return successResponse(items);
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
      createInventoryItemSchema,
    );

    const database = await connectToDatabase();
    const session = await database.startSession();
    let item;

    try {
      await session.withTransaction(async () => {
        const [createdItem] = await InventoryItem.create(
          [
            {
              ...input,
              sku: input.sku.toUpperCase(),
              currentStock: 0,
              averageUnitCost: 0,
              createdBy: actor.id,
              updatedBy: actor.id,
            },
          ],
          { session },
        );

        if (input.currentStock > 0) {
          await recordInventoryMovement({
            inventoryItemId: String(createdItem._id),
            type: "opening",
            quantity: input.currentStock,
            unitCost: input.averageUnitCost,
            referenceType: "opening",
            reason: "Opening stock recorded when the inventory item was created.",
            actorId: actor.id,
            session,
          });
        }

        item = await InventoryItem.findById(createdItem._id)
          .session(session)
          .lean();
      });
    } finally {
      await session.endSession();
    }

    return successResponse(
      item,
      "Inventory item created.",
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
