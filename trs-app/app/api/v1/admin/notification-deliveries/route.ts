import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { NotificationDelivery } from "@/models/NotificationDelivery";

export async function GET(request: Request) {
  try {
    await requirePermission("notifications.read");
    await connectToDatabase();

    const url = new URL(request.url);
    const page = Math.max(Number(url.searchParams.get("page") ?? 1), 1);
    const limit = Math.min(
      Math.max(Number(url.searchParams.get("limit") ?? 25), 1),
      100,
    );
    const status = url.searchParams.get("status");
    const channel = url.searchParams.get("channel");

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (channel) filter.channel = channel;

    const [deliveries, total] = await Promise.all([
      NotificationDelivery.find(filter)
        .populate("recipientId", "name email phone")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      NotificationDelivery.countDocuments(filter),
    ]);

    return successResponse({
      deliveries,
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
