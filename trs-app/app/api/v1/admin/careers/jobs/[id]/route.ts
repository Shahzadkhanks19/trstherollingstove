import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { CareerOpening } from "@/models/CareerOpening";
import { updateCareerOpeningSchema } from "@/validators/careers";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requirePermission("cms.manage");
    const { id } = await context.params;
    const input = await validateRequestBody(request, updateCareerOpeningSchema);
    await connectToDatabase();
    const item = await CareerOpening.findByIdAndUpdate(id, { $set: { ...input, updatedBy: actor.id } }, { returnDocument: "after" });
    if (!item) throw new AppError("Job opening not found.", 404);
    return successResponse(item, "Job opening updated.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    await requirePermission("cms.manage");
    const { id } = await context.params;
    await connectToDatabase();
    const item = await CareerOpening.findByIdAndDelete(id);
    if (!item) throw new AppError("Job opening not found.", 404);
    return successResponse(null, "Job opening deleted.");
  } catch (error) {
    return handleApiError(error);
  }
}
