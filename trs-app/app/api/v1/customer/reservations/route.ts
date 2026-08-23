import { requireAuthenticatedUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { Reservation } from "@/models/Reservation";
import { createReservation } from "@/services/reservation.service";
import { createReservationSchema } from "@/validators/reservation";

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
    const status = url.searchParams.get("status");

    const filter: Record<string, unknown> = { customerId: actor.id };
    if (status) filter.status = status;

    const [reservations, total] = await Promise.all([
      Reservation.find(filter)
        .sort({ reservationDate: -1, startTime: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Reservation.countDocuments(filter),
    ]);

    return successResponse({
      reservations,
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

export async function POST(request: Request) {
  try {
    const actor = await requireAuthenticatedUser();
    if (actor.roleKey !== "customer") {
      throw new AppError("Customer access required.", 403);
    }

    const input = await validateRequestBody(request, createReservationSchema);
    await connectToDatabase();

    const reservation = await createReservation({
      customerId: actor.id,
      actorId: actor.id,
      source: "website",
      ...input,
    });

    return successResponse(
      reservation,
      "Reservation requested successfully.",
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
