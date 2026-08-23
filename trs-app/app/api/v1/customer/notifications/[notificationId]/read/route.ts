import { requireAuthenticatedUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { Notification } from "@/models/Notification";

type Context = { params: Promise<{ notificationId: string }> };

export async function PATCH(_request: Request, context: Context) {
  try {
    const actor = await requireAuthenticatedUser();
    if (actor.roleKey !== "customer") {
      throw new AppError("Customer access required.", 403);
    }

    const { notificationId } = await context.params;
    await connectToDatabase();

    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        recipientId: actor.id,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );

    if (!notification) throw new AppError("Notification not found.", 404);

    return successResponse(notification, "Notification marked as read.");
  } catch (error) {
    return handleApiError(error);
  }
}
