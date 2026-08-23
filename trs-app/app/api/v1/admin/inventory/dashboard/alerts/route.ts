import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { getInventoryDashboardAlertBreakdown } from "@/services/inventory-dashboard.service";

export async function GET() {
  try {
    await requirePermission("inventory.read");
    await connectToDatabase();

    return successResponse({
      breakdown:
        await getInventoryDashboardAlertBreakdown(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
