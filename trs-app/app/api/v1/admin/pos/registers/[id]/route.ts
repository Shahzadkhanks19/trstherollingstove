import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { POSRegister } from "@/models/POSRegister";
import { updateRegisterSchema } from "@/validators/pos";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: Request,
  context: Context,
) {
  try {
    const actor = await requirePermission("pos.manage");
    const { id } = await context.params;
    const input = await validateRequestBody(
      request,
      updateRegisterSchema,
    );

    await connectToDatabase();

    const register = await POSRegister.findByIdAndUpdate(
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
      { returnDocument: "after" },
    );

    if (!register) {
      throw new AppError("POS register not found.", 404);
    }

    return successResponse(
      register,
      "POS register updated.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
