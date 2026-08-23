import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { InventoryAlertEvent } from "@/models/InventoryAlertEvent";
import { InventoryAlertRule } from "@/models/InventoryAlertRule";
import { updateInventoryAlertRuleSchema } from "@/validators/inventory-alerts-reports";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  context: Context,
) {
  try {
    await requirePermission("inventory.read");
    const { id } = await context.params;
    await connectToDatabase();

    const rule = await InventoryAlertRule.findById(id).lean();
    if (!rule) {
      throw new AppError("Inventory alert rule not found.", 404);
    }

    return successResponse(rule);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  context: Context,
) {
  try {
    const actor = await requirePermission("inventory.manage");
    const { id } = await context.params;
    const input = await validateRequestBody(
      request,
      updateInventoryAlertRuleSchema,
    );
    await connectToDatabase();

    const rule = await InventoryAlertRule.findByIdAndUpdate(
      id,
      {
        $set: {
          ...input,
          updatedBy: actor.id,
        },
      },
      { returnDocument: "after" },
    );

    if (!rule) {
      throw new AppError("Inventory alert rule not found.", 404);
    }

    return successResponse(
      rule,
      "Inventory alert rule updated.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: Context,
) {
  try {
    await requirePermission("inventory.manage");
    const { id } = await context.params;
    await connectToDatabase();

    const eventCount =
      await InventoryAlertEvent.countDocuments({
        ruleId: id,
      });
    if (eventCount > 0) {
      throw new AppError(
        "This rule has alert history and cannot be deleted. Disable it instead.",
        409,
      );
    }

    const rule = await InventoryAlertRule.findByIdAndDelete(id);
    if (!rule) {
      throw new AppError("Inventory alert rule not found.", 404);
    }

    return successResponse(
      { id },
      "Inventory alert rule deleted.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
