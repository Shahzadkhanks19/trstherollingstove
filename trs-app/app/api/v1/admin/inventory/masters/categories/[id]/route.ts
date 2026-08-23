import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { InventoryCategory } from "@/models/InventoryCategory";
import { inventoryCategorySchema } from "@/validators/inventoryMasters";

type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requirePermission("inventory.manage");
    const input = await validateRequestBody(request, inventoryCategorySchema.partial());
    const { id } = await context.params;
    await connectToDatabase();
    const row = await InventoryCategory.findByIdAndUpdate(id, { $set: { ...input, updatedBy: actor.id } }, { returnDocument: "after", runValidators: true });
    if (!row) throw new AppError("Record not found.", 404);
    return successResponse(row, "Updated successfully.");
  } catch (error) { return handleApiError(error); }
}
export async function DELETE(_request: Request, context: Context) {
  try {
    const actor = await requirePermission("inventory.manage");
    const { id } = await context.params;
    await connectToDatabase();
    const row = await InventoryCategory.findByIdAndUpdate(id, { $set: { isActive: false, updatedBy: actor.id } }, { returnDocument: "after", runValidators: true });
    if (!row) throw new AppError("Record not found.", 404);
    return successResponse(row, "Deactivated successfully.");
  } catch (error) { return handleApiError(error); }
}
