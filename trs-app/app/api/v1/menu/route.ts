import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { MenuCategory } from "@/models/MenuCategory";
import { MenuItem } from "@/models/MenuItem";

export async function GET(request: Request) {
  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const channel = url.searchParams.get("channel");
    const itemFilter: Record<string, unknown> = {
      deletedAt: null,
      isActive: true,
      isAvailable: true,
    };

    if (channel === "dine_in") itemFilter.availableForDineIn = true;
    if (channel === "takeaway") itemFilter.availableForTakeaway = true;

    const categories = await MenuCategory.find({
      deletedAt: null,
      isActive: true,
    })
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    const items = await MenuItem.find({
      ...itemFilter,
      categoryId: { $in: categories.map((category) => category._id) },
    })
      .populate("modifierGroupIds")
      .populate("taxClassId", "name code percentage isInclusive")
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    const grouped = categories.map((category) => ({
      category,
      items: items.filter((item) => String(item.categoryId) === String(category._id)),
    })).filter((group) => group.items.length > 0);

    return successResponse(grouped, "Menu loaded.");
  } catch (error) {
    return handleApiError(error);
  }
}
