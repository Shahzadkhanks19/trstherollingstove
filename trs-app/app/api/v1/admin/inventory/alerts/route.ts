import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { InventoryItem } from "@/models/InventoryItem";
import { InventoryMovement } from "@/models/InventoryMovement";

export async function GET() {
  try {
    await requirePermission("inventory.read");
    await connectToDatabase();

    const now = new Date();
    const expiryLimit = new Date(
      now.getTime() + 7 * 24 * 60 * 60 * 1000,
    );

    const [lowStockItems, expiringBatches] =
      await Promise.all([
        InventoryItem.find({
          isActive: true,
          $expr: {
            $lte: [
              "$currentStock",
              "$reorderLevel",
            ],
          },
        })
          .sort({ currentStock: 1 })
          .lean(),
        InventoryMovement.find({
          expiryDate: {
            $gte: now,
            $lte: expiryLimit,
          },
          type: {
            $in: ["opening", "purchase", "return_in"],
          },
        })
          .populate(
            "inventoryItemId",
            "name sku unit",
          )
          .sort({ expiryDate: 1 })
          .lean(),
      ]);

    return successResponse({
      lowStockItems,
      expiringBatches,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
