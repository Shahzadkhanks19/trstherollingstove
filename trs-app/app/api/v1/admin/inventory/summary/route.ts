import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { InventoryItem } from "@/models/InventoryItem";

export async function GET() {
  try {
    await requirePermission("inventory.read");
    await connectToDatabase();

    const [summary] = await InventoryItem.aggregate([
      {
        $match: {
          isActive: true,
        },
      },
      {
        $group: {
          _id: null,
          totalItems: {
            $sum: 1,
          },
          totalStockValue: {
            $sum: {
              $multiply: [
                "$currentStock",
                "$averageUnitCost",
              ],
            },
          },
          lowStockItems: {
            $sum: {
              $cond: [
                {
                  $lte: [
                    "$currentStock",
                    "$reorderLevel",
                  ],
                },
                1,
                0,
              ],
            },
          },
          outOfStockItems: {
            $sum: {
              $cond: [
                {
                  $lte: ["$currentStock", 0],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalItems: 1,
          lowStockItems: 1,
          outOfStockItems: 1,
          totalStockValue: {
            $round: ["$totalStockValue", 2],
          },
        },
      },
    ]);

    return successResponse(
      summary ?? {
        totalItems: 0,
        totalStockValue: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
      },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
