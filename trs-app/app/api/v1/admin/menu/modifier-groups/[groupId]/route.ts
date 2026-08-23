import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { revalidatePublicMenuPaths } from "@/lib/menu-cache";
import { MenuItem } from "@/models/MenuItem";
import { ModifierGroup } from "@/models/ModifierGroup";
import { writeAuditLog } from "@/services/audit.service";
import { modifierGroupUpdateSchema } from "@/validators/menu";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ groupId: string }> },
) {
  try {
    const actor = await requirePermission("menu.update");
    const { groupId } = await context.params;
    const input = await validateRequestBody(request, modifierGroupUpdateSchema);
    await connectToDatabase();

    const group = await ModifierGroup.findById(groupId);
    if (!group) throw new AppError("Modifier group not found.", 404);

    if (
      input.internalName &&
      await ModifierGroup.exists({ internalName: input.internalName, _id: { $ne: group._id } })
    ) {
      throw new AppError("A modifier group with this internal name already exists.", 409);
    }

    const nextIsActive = input.isActive ?? group.isActive;
    const nextOptions = input.options ?? group.options;
    if (nextIsActive && nextOptions.length === 0) {
      throw new AppError(
        "An active modifier group must contain at least one option.",
        400,
      );
    }

    group.set(input);
    group.set("updatedBy", actor.id);
    if (input.options) {
      group.markModified("options");
    }
    await group.save();

    const persistedGroup = await ModifierGroup.findById(group._id);
    if (!persistedGroup) {
      throw new AppError("Modifier group was not found after saving.", 500);
    }
    if (
      input.options &&
      persistedGroup.options.length !== input.options.length
    ) {
      throw new AppError(
        "Modifier options were not persisted. Please retry the update.",
        500,
      );
    }

    await writeAuditLog({
      actorUserId: actor.id,
      action: "menu.modifier_group_updated",
      entityType: "modifier_group",
      entityId: group.id,
      description: `Modifier group ${group.name} updated.`,
    });

    revalidatePublicMenuPaths();
    return successResponse(persistedGroup, "Modifier group updated.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ groupId: string }> },
) {
  try {
    const actor = await requirePermission("menu.delete");
    const { groupId } = await context.params;
    await connectToDatabase();

    if (await MenuItem.exists({ modifierGroupIds: groupId, deletedAt: null })) {
      throw new AppError("Remove this modifier group from all menu items first.", 409);
    }

    const group = await ModifierGroup.findByIdAndDelete(groupId);
    if (!group) throw new AppError("Modifier group not found.", 404);

    await writeAuditLog({
      actorUserId: actor.id,
      action: "menu.modifier_group_deleted",
      entityType: "modifier_group",
      entityId: group.id,
      description: `Modifier group ${group.name} deleted.`,
    });

    revalidatePublicMenuPaths();
    return successResponse(null, "Modifier group deleted.");
  } catch (error) {
    return handleApiError(error);
  }
}
