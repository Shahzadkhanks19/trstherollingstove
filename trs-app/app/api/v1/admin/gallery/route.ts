import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { GalleryItem } from "@/models/GalleryItem";
import { createGalleryItemSchema } from "@/validators/cms";

export async function GET() {
  try {
    await requirePermission("cms.read");
    await connectToDatabase();
    return successResponse(await GalleryItem.find().sort({ sortOrder: 1, createdAt: -1 }).lean());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("cms.manage");
    const input = await validateRequestBody(request, createGalleryItemSchema);
    await connectToDatabase();

    const item = await GalleryItem.create({
      ...input,
      createdBy: actor.id,
      updatedBy: actor.id,
    });

    revalidatePath("/gallery");
    return successResponse(item, "Gallery item created.", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
