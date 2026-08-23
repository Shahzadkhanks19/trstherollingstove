import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { MenuCategory } from "@/models/MenuCategory";
import { MenuItem } from "@/models/MenuItem";
import { writeAuditLog } from "@/services/audit.service";
import { publishMenuUpdated } from "@/services/realtimeEvents.service";
import { createSlug } from "@/utils/slug";
import { categoryUpdateSchema } from "@/validators/menu";
import { Types } from "mongoose";

export async function GET(
  _request: Request,
  context: { params: Promise<{ categoryId: string }> },
) {
  try {
    await requirePermission("menu.read");
    const { categoryId } = await context.params;
    await connectToDatabase();

    const category = await MenuCategory.findOne({ _id: categoryId, deletedAt: null }).lean();
    if (!category) throw new AppError("Category not found.", 404);

    return successResponse(category, "Category loaded.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ categoryId: string }> },
) {
  try {
    const actor = await requirePermission("menu.update");
    const { categoryId } = await context.params;
    const input = await validateRequestBody(request, categoryUpdateSchema);
    await connectToDatabase();

    const category = await MenuCategory.findOne({ _id: categoryId, deletedAt: null });
    if (!category) throw new AppError("Category not found.", 404);

    if (input.slug || input.name) {
      const slug = createSlug(input.slug || input.name || category.name);
      const duplicate = await MenuCategory.exists({ slug, _id: { $ne: category._id } });
      if (duplicate) throw new AppError("A category with this slug already exists.", 409);
      category.slug = slug;
    }

    Object.assign(category, { ...input, slug: category.slug, updatedBy: actor.id });
    await category.save();

    await writeAuditLog({
      actorUserId: actor.id,
      action: "menu.category_updated",
      entityType: "menu_category",
      entityId: category.id,
      description: `Menu category ${category.name} updated.`,
    });

    publishMenuUpdated({ action: "updated", categoryId: category.id, actorId: actor.id });

    return successResponse(category, "Category updated.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ categoryId: string }> },
) {
  try {
    const actor = await requirePermission("menu.delete");
    const { categoryId } = await context.params;
    await connectToDatabase();

    const category = await MenuCategory.findOne({ _id: categoryId, deletedAt: null });
    if (!category) throw new AppError("Category not found.", 404);

    const itemCount = await MenuItem.countDocuments({ categoryId, deletedAt: null });
    if (itemCount > 0) {
      throw new AppError("Move or delete all menu items in this category first.", 409);
    }

    category.deletedAt = new Date();
    category.isActive = false;
    category.updatedBy = new Types.ObjectId(actor.id);
    await category.save();

    await writeAuditLog({
      actorUserId: actor.id,
      action: "menu.category_deleted",
      entityType: "menu_category",
      entityId: category.id,
      description: `Menu category ${category.name} deleted.`,
    });

    publishMenuUpdated({ action: "deleted", categoryId: category.id, actorId: actor.id });

    return successResponse(null, "Category deleted.");
  } catch (error) {
    return handleApiError(error);
  }
}
