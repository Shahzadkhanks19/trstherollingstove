import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { Order } from "@/models/Order";
import { Review } from "@/models/Review";
import { User } from "@/models/User";
import { getPagination } from "@/utils/pagination";

void Order;
void User;

const reviewStatuses = new Set(["pending", "published", "rejected", "hidden"]);

export async function GET(request: Request) {
  try {
    await requirePermission("reviews.read");
    await connectToDatabase();

    const url = new URL(request.url);
    const { page, limit, skip } = getPagination(url.searchParams);
    const requestedStatus = url.searchParams.get("status")?.trim();
    const rating = Number(url.searchParams.get("rating") ?? 0);
    const search = url.searchParams.get("search")?.trim();

    const filter: Record<string, unknown> = {};
    if (requestedStatus && requestedStatus !== "all" && reviewStatuses.has(requestedStatus)) {
      filter.status = requestedStatus;
    }
    if (Number.isInteger(rating) && rating >= 1 && rating <= 5) filter.rating = rating;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { comment: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
      ];
    }

    const [reviews, total, counts] = await Promise.all([
      Review.find(filter)
        .populate("customerId", "name email phone avatarUrl")
        .populate("orderId", "orderNumber status createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
      Review.aggregate<{ _id: string; count: number }>([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const statusCounts = Object.fromEntries(counts.map((entry) => [entry._id, entry.count]));
    statusCounts.all = counts.reduce((sum, entry) => sum + entry.count, 0);

    return successResponse({
      reviews,
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
      statusCounts,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
