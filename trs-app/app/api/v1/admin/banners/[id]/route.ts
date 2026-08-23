import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { SiteBanner } from "@/models/SiteBanner";
import { updateBannerSchema } from "@/validators/cms";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requirePermission("cms.manage");
    const { id } = await context.params;
    const input = await validateRequestBody(request, updateBannerSchema);
    await connectToDatabase();

    const payload = {
      ...input,
      ...(input.startsAt !== undefined
        ? { startsAt: input.startsAt ? new Date(input.startsAt) : null }
        : {}),
      ...(input.endsAt !== undefined
        ? { endsAt: input.endsAt ? new Date(input.endsAt) : null }
        : {}),
      updatedBy: actor.id,
    };

    const banner = await SiteBanner.findByIdAndUpdate(
      id,
      { $set: payload },
      { returnDocument: "after" },
    );

    if (!banner) throw new AppError("Banner not found.", 404);
    return successResponse(banner, "Banner updated.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    await requirePermission("cms.manage");
    const { id } = await context.params;
    await connectToDatabase();

    const banner = await SiteBanner.findByIdAndDelete(id);
    if (!banner) throw new AppError("Banner not found.", 404);

    return successResponse(null, "Banner deleted.");
  } catch (error) {
    return handleApiError(error);
  }
}
