import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { KitchenRoutingRule } from "@/models/KitchenRoutingRule";
import { createRoutingRuleSchema } from "@/validators/kds";

export async function GET() {
  try {
    await requirePermission("kds.manage");
    await connectToDatabase();

    const rules = await KitchenRoutingRule.find()
      .populate("stationId", "name code")
      .populate("menuItemId", "name")
      .populate("categoryId", "name")
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    return successResponse(rules);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("kds.manage");
    const input = await validateRequestBody(
      request,
      createRoutingRuleSchema,
    );

    await connectToDatabase();

    const rule = await KitchenRoutingRule.create({
      ...input,
      createdBy: actor.id,
      updatedBy: actor.id,
    });

    return successResponse(
      rule,
      "Kitchen routing rule created.",
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
