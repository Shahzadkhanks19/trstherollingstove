import { requireAuthenticatedUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { Notification } from "@/models/Notification";

export async function GET(request: Request) {
  try {
    const actor = await requireAuthenticatedUser();
    if (actor.roleKey !== "customer") {
      throw new AppError("Customer access required.", 403);
    }

    await connectToDatabase();

    const url = new URL(request.url);
    const page = Math.max(Number(url.searchParams.get("page") ?? 1), 1);
    const limit = Math.min(
      Math.max(Number(url.searchParams.get("limit") ?? 20), 1),
      100,
    );
    const unreadOnly = url.searchParams.get("unreadOnly") === "true";

    const filter: Record<string, unknown> = {
      recipientId: actor.id,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    };

    if (unreadOnly) filter.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({
        recipientId: actor.id,
        isRead: false,
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      }),
    ]);

    return successResponse({
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
