import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { KitchenRoutingRule } from "@/models/KitchenRoutingRule";
import { updateRoutingRuleSchema } from "@/validators/kds";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: Request,
  context: Context,
) {
  try {
    const actor = await requirePermission("kds.manage");
    const { id } = await context.params;
    const input = await validateRequestBody(
      request,
      updateRoutingRuleSchema,
    );

    await connectToDatabase();

    const rule =
      await KitchenRoutingRule.findByIdAndUpdate(
        id,
        {
          $set: {
            ...input,
            updatedBy: actor.id,
          },
        },
        {
          returnDocument: "after",
        },
      );

    if (!rule) {
      throw new AppError(
        "Kitchen routing rule not found.",
        404,
      );
    }

    return successResponse(
      rule,
      "Kitchen routing rule updated.",
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
    await requirePermission("kds.manage");
    const { id } = await context.params;

    await connectToDatabase();

    const rule =
      await KitchenRoutingRule.findByIdAndDelete(id);

    if (!rule) {
      throw new AppError(
        "Kitchen routing rule not found.",
        404,
      );
    }

    return successResponse(
      null,
      "Kitchen routing rule deleted.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
