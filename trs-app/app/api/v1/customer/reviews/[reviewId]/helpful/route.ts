import { requireAuthenticatedUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { toggleHelpfulVote } from "@/services/review.service";

type Context = { params: Promise<{ reviewId: string }> };

export async function POST(_request: Request, context: Context) {
  try {
    const actor = await requireAuthenticatedUser();
    const { reviewId } = await context.params;

    await connectToDatabase();

    const result = await toggleHelpfulVote({
      reviewId,
      userId: actor.id,
    });

    return successResponse(result, "Helpful vote updated.");
  } catch (error) {
    return handleApiError(error);
  }
}
