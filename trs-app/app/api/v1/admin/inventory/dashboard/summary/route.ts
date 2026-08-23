import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { getInventoryDashboardSummary } from "@/services/inventory-dashboard.service";

export async function GET() {
  try {
    await requirePermission("inventory.read");
    await connectToDatabase();

    return successResponse(
      await getInventoryDashboardSummary(),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
