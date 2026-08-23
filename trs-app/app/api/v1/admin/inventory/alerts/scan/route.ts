import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { evaluateInventoryAlerts } from "@/services/inventory-alert.service";
import { inventoryAlertScanSchema } from "@/validators/inventory-alerts-reports";

export async function POST(request: Request) {
  try {
    await requirePermission("inventory.manage");
    const input = await validateRequestBody(
      request,
      inventoryAlertScanSchema,
    );
    await connectToDatabase();

    return successResponse(
      await evaluateInventoryAlerts(input.ruleIds),
      "Inventory alert scan completed.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
