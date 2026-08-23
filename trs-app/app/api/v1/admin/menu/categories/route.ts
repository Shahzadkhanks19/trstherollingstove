import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { MenuCategory } from "@/models/MenuCategory";
import { writeAuditLog } from "@/services/audit.service";
import { publishMenuUpdated } from "@/services/realtimeEvents.service";
import { createSlug } from "@/utils/slug";
import { categoryCreateSchema } from "@/validators/menu";

export async function GET(request: Request) {
  try {
    await requirePermission("menu.read");
    await connectToDatabase();

    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim();
    const includeInactive = url.searchParams.get("includeInactive") === "true";

    const filter: Record<string, unknown> = { deletedAt: null };
    if (!includeInactive) filter.isActive = true;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const categories = await MenuCategory.find(filter)
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    return successResponse(categories, "Categories loaded.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("menu.create");
    const input = await validateRequestBody(request, categoryCreateSchema);
    await connectToDatabase();

    const slug = createSlug(input.slug || input.name);
    if (!slug) throw new AppError("Unable to generate category slug.", 400);
    if (await MenuCategory.exists({ slug })) {
      throw new AppError("A category with this slug already exists.", 409);
    }

    const category = await MenuCategory.create({
      ...input,
      slug,
      createdBy: actor.id,
      updatedBy: actor.id,
    });

    await writeAuditLog({
      actorUserId: actor.id,
      action: "menu.category_created",
      entityType: "menu_category",
      entityId: category.id,
      description: `Menu category ${category.name} created.`,
    });

    publishMenuUpdated({ action: "created", categoryId: category.id, actorId: actor.id });

    return successResponse(category, "Category created.", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
