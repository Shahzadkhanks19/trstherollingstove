import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { writeAuditLog } from "@/services/audit.service";
import { sendBroadcast } from "@/services/notification.service";
import { createBroadcastSchema } from "@/validators/notification";

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("notifications.manage");
    const input = await validateRequestBody(request, createBroadcastSchema);
    await connectToDatabase();

    const result = await sendBroadcast({
      actorId: actor.id,
      ...input,
    });

    await writeAuditLog({
      actorUserId: actor.id,
      action: "notification.broadcast_sent",
      entityType: "notification",
      description: `Broadcast sent to ${result.recipientCount} recipient(s).`,
    });

    return successResponse(result, "Broadcast processed.", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
