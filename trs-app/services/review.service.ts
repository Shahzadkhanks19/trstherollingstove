import { Types } from "mongoose";

import { AppError } from "@/lib/errors/AppError";
import { Order } from "@/models/Order";
import { Review } from "@/models/Review";
import { ReviewHelpfulVote } from "@/models/ReviewHelpfulVote";

export async function createCustomerReview(input: {
  customerId: string;
  orderId: string;
  rating: number;
  categoryRatings: {
    foodQuality: number;
    taste: number;
    service: number;
    speed: number;
    packaging: number | null;
  };
  recommendation: "definitely" | "maybe" | "no";
  tags: string[];
  title: string;
  comment: string;
  images: string[];
}) {
  const order = await Order.findOne({ _id: input.orderId, customerId: input.customerId }).lean();
  if (!order) throw new AppError("Order not found.", 404);
  if (order.status === "cancelled" || order.status === "rejected") {
    throw new AppError("Cancelled orders cannot be reviewed.", 400);
  }
  if (order.status !== "completed") {
    throw new AppError("A review can only be submitted after the order is completed.", 400);
  }
  if (order.orderMode === "dine_in" && input.categoryRatings.packaging !== null) {
    throw new AppError("Packaging rating is not applicable to dine-in orders.", 400);
  }
  const existingReview = await Review.findOne({ orderId: input.orderId }).lean();
  if (existingReview) throw new AppError("This order has already been reviewed.", 409);

  return Review.create({
    ...input,
    customerId: new Types.ObjectId(input.customerId),
    orderId: new Types.ObjectId(input.orderId),
    status: "pending",
    approved: false,
    visible: false,
  });
}

export async function updateCustomerReview(input: {
  reviewId: string;
  customerId: string;
  data: Partial<{
    rating: number;
    categoryRatings: {
      foodQuality: number;
      taste: number;
      service: number;
      speed: number;
      packaging: number | null;
    };
    recommendation: "definitely" | "maybe" | "no";
    tags: string[];
    title: string;
    comment: string;
    images: string[];
  }>;
}) {
  const review = await Review.findOne({
    _id: input.reviewId,
    customerId: input.customerId,
  });

  if (!review) throw new AppError("Review not found.", 404);

  if (review.status === "published") {
    review.status = "pending";
    review.moderationNote = "";
    review.moderatedAt = null;
    review.moderatedBy = null;
  }

  Object.assign(review, input.data);
  await review.save();

  return review;
}

export async function toggleHelpfulVote(input: {
  reviewId: string;
  userId: string;
}) {
  const review = await Review.findOne({
    _id: input.reviewId,
    status: "published",
  });

  if (!review) throw new AppError("Review not found.", 404);

  const existingVote = await ReviewHelpfulVote.findOne({
    reviewId: input.reviewId,
    userId: input.userId,
  });

  if (existingVote) {
    await existingVote.deleteOne();
    review.helpfulCount = Math.max(review.helpfulCount - 1, 0);
    await review.save();

    return { helpful: false, helpfulCount: review.helpfulCount };
  }

  await ReviewHelpfulVote.create({
    reviewId: new Types.ObjectId(input.reviewId),
    userId: new Types.ObjectId(input.userId),
  });

  review.helpfulCount += 1;
  await review.save();

  return { helpful: true, helpfulCount: review.helpfulCount };
}
