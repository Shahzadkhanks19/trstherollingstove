import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { getInventoryDashboardTrends } from "@/services/inventory-dashboard.service";

export async function GET(request: Request) {
  try {
    await requirePermission("inventory.read");
    await connectToDatabase();

    const url = new URL(request.url);
    const days = Number(url.searchParams.get("days") ?? 30);

    return successResponse(
      await getInventoryDashboardTrends(days),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
