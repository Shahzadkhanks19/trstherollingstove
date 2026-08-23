import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { getInventoryDashboardTopItems } from "@/services/inventory-dashboard.service";

export async function GET(request: Request) {
  try {
    await requirePermission("inventory.read");
    await connectToDatabase();

    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? 10);

    return successResponse(
      await getInventoryDashboardTopItems(limit),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
