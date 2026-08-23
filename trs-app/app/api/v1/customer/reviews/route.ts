import { isValidObjectId } from "mongoose";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { Order } from "@/models/Order";
import { Review } from "@/models/Review";
import { createCustomerReview } from "@/services/review.service";
import { createReviewSchema } from "@/validators/review";
import { publishRealtimeEventSafely } from "@/services/realtimePublisher.service";

export async function GET(request: Request) {
  try {
    const actor = await requireAuthenticatedUser();
    if (actor.roleKey !== "customer") throw new AppError("Customer access required.", 403);
    await connectToDatabase();

    const orderReference = new URL(request.url).searchParams.get("order")?.trim();
    if (orderReference) {
      const referenceFilter = isValidObjectId(orderReference)
        ? { $or: [{ _id: orderReference }, { orderNumber: orderReference.toUpperCase() }] }
        : { orderNumber: orderReference.toUpperCase() };
      const order = await Order.findOne({ customerId: actor.id, ...referenceFilter })
        .select("orderNumber orderMode status paymentStatus completedAt items")
        .lean();
      if (!order) throw new AppError("Order not found.", 404);
      if (order.status !== "completed") throw new AppError("This order has not been completed yet.", 409);
      if (order.paymentStatus !== "paid") throw new AppError("This order does not have a confirmed payment.", 409);
      const existing = await Review.findOne({ orderId: order._id }).select("_id status createdAt").lean();
      return successResponse({
        order: {
          id: String(order._id), orderNumber: order.orderNumber, orderMode: order.orderMode,
          completedAt: order.completedAt, items: order.items.slice(0, 3).map((item) => item.name),
        },
        alreadyReviewed: Boolean(existing),
        existingReview: existing ? { id: String(existing._id), status: existing.status, createdAt: existing.createdAt } : null,
      }, "Review eligibility loaded.");
    }

    const reviews = await Review.find({ customerId: actor.id })
      .populate("orderId", "orderNumber status createdAt").sort({ createdAt: -1 }).lean();
    return successResponse(reviews);
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAuthenticatedUser();
    if (actor.roleKey !== "customer") throw new AppError("Customer access required.", 403);
    const input = await validateRequestBody(request, createReviewSchema);
    await connectToDatabase();
    const review = await createCustomerReview({ customerId: actor.id, ...input });
    publishRealtimeEventSafely({ event: "review.created", entityId: String(review._id), actorId: actor.id, data: { reviewId: String(review._id), orderId: input.orderId, rating: input.rating }, target: { roleKeys: ["super_admin", "admin", "manager"] } });
    return successResponse({ id: String(review._id), status: review.status }, "Review submitted for moderation.", 201);
  } catch (error) { return handleApiError(error); }
}
