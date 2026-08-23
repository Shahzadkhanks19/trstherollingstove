import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { MenuItemRecipe } from "@/models/MenuItemRecipe";
import { upsertMenuItemRecipeSchema } from "@/validators/inventory";

export async function GET(request: Request) {
  try {
    await requirePermission("inventory.read");
    await connectToDatabase();

    const url = new URL(request.url);
    const menuItemId =
      url.searchParams.get("menuItemId");

    const filter = menuItemId
      ? { menuItemId }
      : {};

    const recipes = await MenuItemRecipe.find(filter)
      .populate("menuItemId", "name slug")
      .populate(
        "ingredients.inventoryItemId",
        "name sku unit currentStock",
      )
      .sort({ updatedAt: -1 })
      .lean();

    return successResponse(recipes);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const actor = await requirePermission(
      "inventory.manage",
    );
    const input = await validateRequestBody(
      request,
      upsertMenuItemRecipeSchema,
    );

    await connectToDatabase();

    const recipe = await MenuItemRecipe.findOneAndUpdate(
      {
        menuItemId: input.menuItemId,
      },
      {
        $set: {
          yieldQuantity: input.yieldQuantity,
          ingredients: input.ingredients,
          isActive: input.isActive,
          updatedBy: actor.id,
        },
        $setOnInsert: {
          menuItemId: input.menuItemId,
          createdBy: actor.id,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      },
    );

    return successResponse(
      recipe,
      "Menu item recipe saved.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
