import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { GalleryItem } from "@/models/GalleryItem";
import { updateGalleryItemSchema } from "@/validators/cms";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requirePermission("cms.manage");
    const { id } = await context.params;
    const input = await validateRequestBody(request, updateGalleryItemSchema);
    await connectToDatabase();

    const item = await GalleryItem.findByIdAndUpdate(
      id,
      { $set: { ...input, updatedBy: actor.id } },
      { returnDocument: "after", runValidators: true },
    );

    if (!item) throw new AppError("Gallery item not found.", 404);
    revalidatePath("/gallery");
    return successResponse(item, "Gallery item updated.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    await requirePermission("cms.manage");
    const { id } = await context.params;
    await connectToDatabase();

    const item = await GalleryItem.findByIdAndDelete(id);
    if (!item) throw new AppError("Gallery item not found.", 404);

    revalidatePath("/gallery");
    return successResponse(null, "Gallery item deleted.");
  } catch (error) {
    return handleApiError(error);
  }
}
