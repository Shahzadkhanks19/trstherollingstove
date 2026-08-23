import { Types } from "mongoose";

import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { SecurityEvent } from "@/models/SecurityEvent";
import { writeAuditLog } from "@/services/audit.service";
import { resolveSecurityEventSchema } from "@/validators/audit";

type Context = {
  params: Promise<{ eventId: string }>;
};

export async function PATCH(
  request: Request,
  context: Context,
) {
  try {
    const actor = await requirePermission(
      "audit_logs.read",
    );

    const { eventId } = await context.params;

    if (!Types.ObjectId.isValid(eventId)) {
      throw new AppError(
        "Invalid security event ID.",
        400,
      );
    }

    const input = await validateRequestBody(
      request,
      resolveSecurityEventSchema,
    );

    await connectToDatabase();

    const event =
      await SecurityEvent.findByIdAndUpdate(
        eventId,
        {
          $set: {
            resolved: true,
            resolvedAt: new Date(),
            resolvedBy:
              new Types.ObjectId(actor.id),
            resolutionNote:
              input.resolutionNote,
          },
        },
        {
          returnDocument: "after",
        },
      );

    if (!event) {
      throw new AppError(
        "Security event not found.",
        404,
      );
    }

    await writeAuditLog({
      actor,
      action: "security_event.resolve",
      module: "security",
      entityType: "SecurityEvent",
      entityId: eventId,
      description:
        "Resolved a security event.",
      metadata: {
        eventType: event.eventType,
        resolutionNote:
          input.resolutionNote,
      },
    });

    return successResponse(
      event,
      "Security event resolved.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
