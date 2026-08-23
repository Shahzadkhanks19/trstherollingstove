import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { POSRegister } from "@/models/POSRegister";
import { createRegisterSchema } from "@/validators/pos";

export async function GET() {
  try {
    await requirePermission("pos.use");
    await connectToDatabase();

    const registers = await POSRegister.find()
      .sort({ isActive: -1, name: 1 })
      .lean();

    return successResponse(registers);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("pos.manage");
    const input = await validateRequestBody(
      request,
      createRegisterSchema,
    );

    await connectToDatabase();

    const register = await POSRegister.create({
      ...input,
      code: input.code.toUpperCase(),
      createdBy: actor.id,
      updatedBy: actor.id,
    });

    return successResponse(
      register,
      "POS register created.",
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
