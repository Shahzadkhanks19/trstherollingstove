import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { KitchenStation } from "@/models/KitchenStation";
import { updateKitchenStationSchema } from "@/validators/kds";

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
      updateKitchenStationSchema,
    );

    await connectToDatabase();

    const station = await KitchenStation.findByIdAndUpdate(
      id,
      {
        $set: {
          ...input,
          ...(input.code
            ? { code: input.code.toUpperCase() }
            : {}),
          updatedBy: actor.id,
        },
      },
      {
        returnDocument: "after",
      },
    );

    if (!station) {
      throw new AppError(
        "Kitchen station not found.",
        404,
      );
    }

    return successResponse(
      station,
      "Kitchen station updated.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
