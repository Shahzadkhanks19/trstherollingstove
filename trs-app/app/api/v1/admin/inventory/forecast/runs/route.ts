import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { InventoryForecastRun } from "@/models/InventoryForecastRun";

export async function GET(request: Request) {
  try {
    await requirePermission("inventory.read");
    const url = new URL(request.url);
    const limit = Math.min(
      Math.max(
        Number(url.searchParams.get("limit") ?? 20),
        1,
      ),
      100,
    );

    await connectToDatabase();

    const runs = await InventoryForecastRun.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return successResponse({ runs });
  } catch (error) {
    return handleApiError(error);
  }
}
