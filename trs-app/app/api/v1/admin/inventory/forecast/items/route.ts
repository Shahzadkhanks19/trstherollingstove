import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { InventoryForecastSnapshot } from "@/models/InventoryForecastSnapshot";
import { getLatestForecastRun } from "@/services/inventory-forecast.service";
import { inventoryForecastQuerySchema } from "@/validators/inventory-forecasting";

export async function GET(request: Request) {
  try {
    await requirePermission("inventory.read");
    const url = new URL(request.url);
    const input = inventoryForecastQuerySchema.parse(
      Object.fromEntries(url.searchParams.entries()),
    );

    await connectToDatabase();

    const run = input.runId
      ? { _id: input.runId }
      : await getLatestForecastRun();

    if (!run) {
      return successResponse({
        rows: [],
        pagination: {
          page: input.page,
          limit: input.limit,
          total: 0,
          pages: 0,
        },
      });
    }

    const filter: Record<string, unknown> = {
      runId: run._id,
      ...(input.riskLevel
        ? { riskLevel: input.riskLevel }
        : {}),
      ...(input.velocityClass
        ? { velocityClass: input.velocityClass }
        : {}),
      ...(input.category
        ? { category: input.category }
        : {}),
    };

    if (input.search) {
      filter.$or = [
        {
          itemName: {
            $regex: input.search,
            $options: "i",
          },
        },
        {
          sku: {
            $regex: input.search,
            $options: "i",
          },
        },
      ];
    }

    const skip = (input.page - 1) * input.limit;
    const [rows, total] = await Promise.all([
      InventoryForecastSnapshot.find(filter)
        .sort({
          riskLevel: 1,
          recommendedOrderValue: -1,
          daysUntilStockout: 1,
        })
        .skip(skip)
        .limit(input.limit)
        .lean(),
      InventoryForecastSnapshot.countDocuments(filter),
    ]);

    return successResponse({
      rows,
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        pages: Math.ceil(total / input.limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
