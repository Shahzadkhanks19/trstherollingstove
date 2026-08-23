import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { Reservation } from "@/models/Reservation";
import { createReservation } from "@/services/reservation.service";
import { writeAuditLog } from "@/services/audit.service";
import { adminCreateReservationSchema } from "@/validators/reservation";

export async function GET(request: Request) {
  try {
    await requirePermission("reservations.read");
    await connectToDatabase();

    const url = new URL(request.url);
    const page = Math.max(Number(url.searchParams.get("page") ?? 1), 1);
    const limit = Math.min(
      Math.max(Number(url.searchParams.get("limit") ?? 25), 1),
      100,
    );
    const status = url.searchParams.get("status");
    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo = url.searchParams.get("dateTo");
    const search = url.searchParams.get("search")?.trim();

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    if (dateFrom || dateTo) {
      filter.reservationDate = {
        ...(dateFrom ? { $gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { $lte: new Date(dateTo) } : {}),
      };
    }

    if (search) {
      filter.$or = [
        { reservationNumber: { $regex: search, $options: "i" } },
        { "customerSnapshot.name": { $regex: search, $options: "i" } },
        { "customerSnapshot.phone": { $regex: search, $options: "i" } },
        { "customerSnapshot.email": { $regex: search, $options: "i" } },
      ];
    }

    const [reservations, total] = await Promise.all([
      Reservation.find(filter)
        .populate("customerId", "name email phone")
        .sort({ reservationDate: 1, startTime: 1 })
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
    const actor = await requirePermission("reservations.manage");
    const input = await validateRequestBody(
      request,
      adminCreateReservationSchema,
    );
    await connectToDatabase();

    const reservation = await createReservation({
      actorId: actor.id,
      ...input,
    });

    await writeAuditLog({
      actorUserId: actor.id,
      action: "reservation.created",
      entityType: "reservation",
      entityId: reservation.id,
      description: `Reservation ${reservation.reservationNumber} created.`,
    });

    return successResponse(reservation, "Reservation created.", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
