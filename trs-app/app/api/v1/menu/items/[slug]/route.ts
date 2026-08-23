import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { MenuItem } from "@/models/MenuItem";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    await connectToDatabase();

    const item = await MenuItem.findOne({
      slug,
      deletedAt: null,
      isActive: true,
      isAvailable: true,
    })
      .populate("categoryId", "name slug")
      .populate("modifierGroupIds")
      .populate("taxClassId", "name code percentage isInclusive")
      .lean();

    if (!item) throw new AppError("Menu item not found.", 404);
    return successResponse(item, "Menu item loaded.");
  } catch (error) {
    return handleApiError(error);
  }
}
