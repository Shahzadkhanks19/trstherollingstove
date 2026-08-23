import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { POSItem } from "@/models/POSItem";
import { updatePosItemSchema } from "@/validators/pos";

type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requirePermission("pos.manage");
    const input = await validateRequestBody(request, updatePosItemSchema);
    const { id } = await context.params;
    await connectToDatabase();
    const item = await POSItem.findByIdAndUpdate(id, { ...input, ...(input.sku ? { sku: input.sku.toUpperCase() } : {}), updatedBy: actor.id }, { returnDocument: "after", runValidators: true });
    if (!item) throw new AppError("POS item not found.", 404);
    return successResponse(item, "POS item updated.");
  } catch (error) { return handleApiError(error); }
}
export async function DELETE(_request: Request, context: Context) {
  try {
    const actor = await requirePermission("pos.manage");
    const { id } = await context.params;
    await connectToDatabase();
    const item = await POSItem.findByIdAndUpdate(id, { isActive: false, updatedBy: actor.id }, { returnDocument: "after" });
    if (!item) throw new AppError("POS item not found.", 404);
    return successResponse(item, "POS item disabled.");
  } catch (error) { return handleApiError(error); }
}
