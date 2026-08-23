import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { revalidatePublicMenuPaths } from "@/lib/menu-cache";
import { ModifierGroup } from "@/models/ModifierGroup";
import { writeAuditLog } from "@/services/audit.service";
import { modifierGroupCreateSchema } from "@/validators/menu";

export async function GET() {
  try {
    await requirePermission("menu.read");
    await connectToDatabase();
    const groups = await ModifierGroup.find().sort({ sortOrder: 1, name: 1 }).lean();
    return successResponse(groups, "Modifier groups loaded.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("menu.create");
    const input = await validateRequestBody(request, modifierGroupCreateSchema);
    await connectToDatabase();

    if (await ModifierGroup.exists({ internalName: input.internalName })) {
      throw new AppError("A modifier group with this internal name already exists.", 409);
    }

    const group = await ModifierGroup.create({ ...input, createdBy: actor.id, updatedBy: actor.id });
    await writeAuditLog({
      actorUserId: actor.id,
      action: "menu.modifier_group_created",
      entityType: "modifier_group",
      entityId: group.id,
      description: `Modifier group ${group.name} created.`,
    });

    revalidatePublicMenuPaths();
    return successResponse(group, "Modifier group created.", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
