import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { Review } from "@/models/Review";
import { writeAuditLog } from "@/services/audit.service";
import { publishReviewUpdated } from "@/services/realtimeEvents.service";
import { moderateReviewSchema } from "@/validators/review";

type Context = { params: Promise<{ reviewId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requirePermission("reviews.manage");
    const { reviewId } = await context.params;
    const input = await validateRequestBody(request, moderateReviewSchema);
    await connectToDatabase();

    const isPublished = input.status === "published";
    const review = await Review.findByIdAndUpdate(
      reviewId,
      {
        $set: {
          status: input.status,
          approved: isPublished,
          visible: isPublished,
          moderationNote: input.moderationNote,
          isFeatured: isPublished && input.isFeatured === true,
          moderatedBy: actor.id,
          moderatedAt: new Date(),
        },
      },
      { returnDocument: "after", runValidators: true },
    );

    if (!review) throw new AppError("Review not found.", 404);

    await writeAuditLog({
      actorUserId: actor.id,
      action: "review.moderated",
      entityType: "review",
      entityId: review.id,
      description: `Review status changed to ${input.status}.`,
    });

    publishReviewUpdated({
      reviewId: review.id,
      customerId: String(review.customerId),
      action: "moderated",
      status: review.status,
      actorId: actor.id,
    });

    return successResponse(review, "Review moderated.");
  } catch (error) {
    return handleApiError(error);
  }
}
