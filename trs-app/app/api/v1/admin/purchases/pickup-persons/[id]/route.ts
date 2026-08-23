import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { PickupPerson } from "@/models/PickupPerson";
import { updatePickupPersonSchema } from "@/validators/purchases";

type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requirePermission("purchases.manage");
    const input = await validateRequestBody(request, updatePickupPersonSchema);
    const { id } = await context.params;
    await connectToDatabase();
    const person = await PickupPerson.findByIdAndUpdate(id, { $set: { ...input, updatedBy: actor.id } }, { returnDocument: "after" });
    if (!person) throw new AppError("Pickup person not found.", 404);
    return successResponse(person, "Pickup person updated.");
  } catch (error) { return handleApiError(error); }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    await requirePermission("purchases.manage");
    const { id } = await context.params;
    await connectToDatabase();
    const { PurchaseOrder } = await import("@/models/PurchaseOrder");
    const usageCount = await PurchaseOrder.countDocuments({ pickupPersonId: id });
    if (usageCount > 0) throw new AppError("This pickup person is used in purchase records and cannot be deleted. Deactivate it instead.", 409);
    const person = await PickupPerson.findByIdAndDelete(id);
    if (!person) throw new AppError("Pickup person not found.", 404);
    return successResponse({ id }, "Pickup person deleted.");
  } catch (error) { return handleApiError(error); }
}
