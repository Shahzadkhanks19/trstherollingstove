import { Types } from "mongoose";

import { requireAuthenticatedUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { NotificationPreference } from "@/models/NotificationPreference";
import { updateNotificationPreferencesSchema } from "@/validators/notification";

export async function GET() {
  try {
    const actor = await requireAuthenticatedUser();
    if (actor.roleKey !== "customer") {
      throw new AppError("Customer access required.", 403);
    }

    await connectToDatabase();

    const preferences = await NotificationPreference.findOneAndUpdate(
      { userId: actor.id },
      {
        $setOnInsert: {
          userId: new Types.ObjectId(actor.id),
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    return successResponse(preferences);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireAuthenticatedUser();
    if (actor.roleKey !== "customer") {
      throw new AppError("Customer access required.", 403);
    }

    const input = await validateRequestBody(
      request,
      updateNotificationPreferencesSchema,
    );
    await connectToDatabase();

    const setPayload = Object.fromEntries(
      Object.entries(input).map(([key, value]) => [key, value]),
    );

    const preferences = await NotificationPreference.findOneAndUpdate(
      { userId: actor.id },
      {
        $set: setPayload,
        $setOnInsert: {
          userId: new Types.ObjectId(actor.id),
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    return successResponse(preferences, "Notification preferences updated.");
  } catch (error) {
    return handleApiError(error);
  }
}
