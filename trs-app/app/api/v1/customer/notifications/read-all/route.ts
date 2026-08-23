import { requireAuthenticatedUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { Notification } from "@/models/Notification";

export async function PATCH() {
  try {
    const actor = await requireAuthenticatedUser();
    if (actor.roleKey !== "customer") {
      throw new AppError("Customer access required.", 403);
    }

    await connectToDatabase();

    const result = await Notification.updateMany(
      {
        recipientId: actor.id,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
    );

    return successResponse(
      { modifiedCount: result.modifiedCount },
      "All notifications marked as read.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
