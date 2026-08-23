import { requireAuthenticatedUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { Review } from "@/models/Review";
import { updateCustomerReview } from "@/services/review.service";
import { updateReviewSchema } from "@/validators/review";

type Context = { params: Promise<{ reviewId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requireAuthenticatedUser();
    if (actor.roleKey !== "customer") {
      throw new AppError("Customer access required.", 403);
    }

    const { reviewId } = await context.params;
    const input = await validateRequestBody(request, updateReviewSchema);
    await connectToDatabase();

    const review = await updateCustomerReview({
      reviewId,
      customerId: actor.id,
      data: input,
    });

    return successResponse(review, "Review updated.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const actor = await requireAuthenticatedUser();
    if (actor.roleKey !== "customer") {
      throw new AppError("Customer access required.", 403);
    }

    const { reviewId } = await context.params;
    await connectToDatabase();

    const review = await Review.findOneAndDelete({
      _id: reviewId,
      customerId: actor.id,
    });

    if (!review) throw new AppError("Review not found.", 404);

    return successResponse(null, "Review deleted.");
  } catch (error) {
    return handleApiError(error);
  }
}
