import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { InventoryAlertRule } from "@/models/InventoryAlertRule";
import { createInventoryAlertRuleSchema } from "@/validators/inventory-alerts-reports";

export async function GET(request: Request) {
  try {
    await requirePermission("inventory.read");
    await connectToDatabase();

    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    const enabled = url.searchParams.get("enabled");
    const filter: Record<string, unknown> = {};

    if (type) filter.type = type;
    if (enabled === "true" || enabled === "false") {
      filter.enabled = enabled === "true";
    }

    const rules = await InventoryAlertRule.find(filter)
      .sort({ enabled: -1, type: 1, name: 1 })
      .lean();

    return successResponse(rules);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("inventory.manage");
    const input = await validateRequestBody(
      request,
      createInventoryAlertRuleSchema,
    );
    await connectToDatabase();

    const rule = await InventoryAlertRule.create({
      ...input,
      createdBy: actor.id,
      updatedBy: actor.id,
    });

    return successResponse(
      rule,
      "Inventory alert rule created.",
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
