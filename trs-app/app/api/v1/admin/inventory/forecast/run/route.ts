import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { generateInventoryForecast } from "@/services/inventory-forecast.service";
import { inventoryForecastRunSchema } from "@/validators/inventory-forecasting";

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("inventory.manage");
    const input = inventoryForecastRunSchema.parse(
      await request.json(),
    );

    await connectToDatabase();

    const result = await generateInventoryForecast({
      ...input,
      source: "manual",
      requestedBy: actor.id,
    });

    return successResponse(
      result,
      "Inventory forecast generated.",
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
