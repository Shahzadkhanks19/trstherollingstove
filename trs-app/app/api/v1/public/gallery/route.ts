import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { getPublicGallery } from "@/services/publicWebsite.service";
import { publicGalleryQuerySchema } from "@/validators/publicWebsite";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const url = new URL(request.url);
    const parsed = publicGalleryQuerySchema.parse(
      Object.fromEntries(url.searchParams.entries()),
    );
    const result = await getPublicGallery(parsed);
    const response = successResponse(result);
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
