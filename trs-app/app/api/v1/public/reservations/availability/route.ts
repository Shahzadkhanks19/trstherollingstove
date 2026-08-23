import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { Reservation } from "@/models/Reservation";
import { reservationAvailabilityQuerySchema } from "@/validators/reservation";

const DEFAULT_SLOTS = [
  { startTime: "12:00", endTime: "13:30" },
  { startTime: "13:30", endTime: "15:00" },
  { startTime: "18:00", endTime: "19:30" },
  { startTime: "19:30", endTime: "21:00" },
  { startTime: "21:00", endTime: "22:30" },
];

const MAX_RESERVATIONS_PER_SLOT = 8;
const MAX_GUESTS_PER_SLOT = 40;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const input = reservationAvailabilityQuerySchema.parse({
      date: url.searchParams.get("date"),
      guestCount: url.searchParams.get("guestCount"),
    });

    await connectToDatabase();

    const dayStart = new Date(`${input.date}T00:00:00.000Z`);
    const dayEnd = new Date(`${input.date}T23:59:59.999Z`);

    const reservations = await Reservation.find({
      reservationDate: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ["pending", "confirmed", "seated"] },
    })
      .select("startTime endTime guestCount")
      .lean();

    const slots = DEFAULT_SLOTS.map((slot) => {
      const overlapping = reservations.filter(
        (reservation) =>
          reservation.startTime < slot.endTime &&
          reservation.endTime > slot.startTime,
      );

      const bookedGuests = overlapping.reduce(
        (sum, reservation) => sum + reservation.guestCount,
        0,
      );

      return {
        ...slot,
        available:
          overlapping.length < MAX_RESERVATIONS_PER_SLOT &&
          bookedGuests + input.guestCount <= MAX_GUESTS_PER_SLOT,
        reservationsCount: overlapping.length,
        bookedGuests,
        remainingGuestCapacity: Math.max(
          0,
          MAX_GUESTS_PER_SLOT - bookedGuests,
        ),
      };
    });

    return successResponse({ date: input.date, slots });
  } catch (error) {
    return handleApiError(error);
  }
}
