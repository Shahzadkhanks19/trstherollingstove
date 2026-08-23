import { requireAuthenticatedUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { cancelCustomerReservation } from "@/services/reservation.service";
import { cancelReservationSchema } from "@/validators/reservation";

type Context = { params: Promise<{ reservationId: string }> };

export async function DELETE(request: Request, context: Context) {
  try {
    const actor = await requireAuthenticatedUser();
    if (actor.roleKey !== "customer") {
      throw new AppError("Customer access required.", 403);
    }

    const { reservationId } = await context.params;
    const input = await validateRequestBody(request, cancelReservationSchema);
    await connectToDatabase();

    const reservation = await cancelCustomerReservation({
      reservationId,
      customerId: actor.id,
      reason: input.reason,
    });

    return successResponse(reservation, "Reservation cancelled.");
  } catch (error) {
    return handleApiError(error);
  }
}
