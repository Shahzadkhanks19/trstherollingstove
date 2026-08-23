import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { MenuItem } from "@/models/MenuItem";
import { TaxClass } from "@/models/TaxClass";
import { writeAuditLog } from "@/services/audit.service";
import { taxClassUpdateSchema } from "@/validators/menu";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ taxClassId: string }> },
) {
  try {
    const actor = await requirePermission("menu.update");
    const { taxClassId } = await context.params;
    const input = await validateRequestBody(request, taxClassUpdateSchema);
    await connectToDatabase();

    const taxClass = await TaxClass.findById(taxClassId);
    if (!taxClass) throw new AppError("Tax class not found.", 404);

    if (input.code && await TaxClass.exists({ code: input.code, _id: { $ne: taxClass._id } })) {
      throw new AppError("A tax class with this code already exists.", 409);
    }

    Object.assign(taxClass, { ...input, updatedBy: actor.id });
    await taxClass.save();

    await writeAuditLog({
      actorUserId: actor.id,
      action: "menu.tax_class_updated",
      entityType: "tax_class",
      entityId: taxClass.id,
      description: `Tax class ${taxClass.code} updated.`,
    });

    return successResponse(taxClass, "Tax class updated.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ taxClassId: string }> },
) {
  try {
    const actor = await requirePermission("menu.delete");
    const { taxClassId } = await context.params;
    await connectToDatabase();

    if (await MenuItem.exists({ taxClassId, deletedAt: null })) {
      throw new AppError("Remove this tax class from all menu items first.", 409);
    }

    const taxClass = await TaxClass.findByIdAndDelete(taxClassId);
    if (!taxClass) throw new AppError("Tax class not found.", 404);

    await writeAuditLog({
      actorUserId: actor.id,
      action: "menu.tax_class_deleted",
      entityType: "tax_class",
      entityId: taxClass.id,
      description: `Tax class ${taxClass.code} deleted.`,
    });

    return successResponse(null, "Tax class deleted.");
  } catch (error) {
    return handleApiError(error);
  }
}
