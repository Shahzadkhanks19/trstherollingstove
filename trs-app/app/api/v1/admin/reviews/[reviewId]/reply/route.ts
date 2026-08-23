import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { Review } from "@/models/Review";
import { writeAuditLog } from "@/services/audit.service";
import { publishReviewUpdated } from "@/services/realtimeEvents.service";
import { ownerReplySchema } from "@/validators/review";

type Context = { params: Promise<{ reviewId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requirePermission("reviews.manage");
    const { reviewId } = await context.params;
    const input = await validateRequestBody(request, ownerReplySchema);
    await connectToDatabase();

    const review = await Review.findByIdAndUpdate(
      reviewId,
      {
        $set: {
          "ownerReply.message": input.message,
          "ownerReply.repliedBy": actor.id,
          "ownerReply.repliedAt": new Date(),
        },
      },
      { returnDocument: "after", runValidators: true },
    );

    if (!review) throw new AppError("Review not found.", 404);

    await writeAuditLog({
      actorUserId: actor.id,
      action: "review.replied",
      entityType: "review",
      entityId: review.id,
      description: "Owner reply updated.",
    });

    publishReviewUpdated({
      reviewId: review.id,
      customerId: String(review.customerId),
      action: "replied",
      status: review.status,
      actorId: actor.id,
    });

    return successResponse(review, "Owner reply saved.");
  } catch (error) {
    return handleApiError(error);
  }
}
