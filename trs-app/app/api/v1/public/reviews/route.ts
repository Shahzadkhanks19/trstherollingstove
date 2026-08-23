import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import {
  getPublicReviews,
} from "@/services/publicWebsite.service";
import {
  publicReviewQuerySchema,
} from "@/validators/publicWebsite";

export async function GET(
  request: Request,
) {
  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const parsed =
      publicReviewQuerySchema.parse(
        Object.fromEntries(
          url.searchParams.entries(),
        ),
      );

    const result =
      await getPublicReviews(parsed);

    return successResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}
