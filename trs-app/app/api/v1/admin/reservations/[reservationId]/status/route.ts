import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { writeAuditLog } from "@/services/audit.service";
import { updateReservationStatus } from "@/services/reservation.service";
import { updateReservationStatusSchema } from "@/validators/reservation";

type Context = { params: Promise<{ reservationId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requirePermission("reservations.manage");
    const { reservationId } = await context.params;
    const input = await validateRequestBody(
      request,
      updateReservationStatusSchema,
    );
    await connectToDatabase();

    const reservation = await updateReservationStatus({
      reservationId,
      actorId: actor.id,
      ...input,
    });

    await writeAuditLog({
      actorUserId: actor.id,
      action: "reservation.status_updated",
      entityType: "reservation",
      entityId: reservation.id,
      description: `Reservation ${reservation.reservationNumber} moved to ${input.status}.`,
    });

    return successResponse(reservation, "Reservation status updated.");
  } catch (error) {
    return handleApiError(error);
  }
}
