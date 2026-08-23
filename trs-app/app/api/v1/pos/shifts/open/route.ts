import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { POSShift } from "@/models/POSShift";
import {
  assertActiveRegister,
  getIndiaBusinessDayRange,
} from "@/services/pos.service";
import { openShiftSchema } from "@/validators/pos";

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("pos.use");
    const input = await validateRequestBody(
      request,
      openShiftSchema,
    );

    await connectToDatabase();
    await assertActiveRegister(input.registerId);

    const { start, end } = getIndiaBusinessDayRange();

    // Close forgotten shifts from an earlier India business day so they do
    // not block today's register opening or carry yesterday's cash forward.
    await POSShift.updateMany(
      {
        registerId: input.registerId,
        status: "open",
        openedAt: { $lt: start },
      },
      {
        $set: {
          status: "closed",
          closedAt: new Date(),
          closedBy: actor.id,
          closingNote: "Automatically closed when a new India business day shift was opened.",
        },
      },
    );

    const existingToday = await POSShift.findOne({
      registerId: input.registerId,
      status: "open",
      openedAt: { $gte: start, $lt: end },
    });

    if (existingToday) {
      throw new AppError(
        "This register already has an open shift for today.",
        409,
      );
    }

    const openingCash = Math.round(Number(input.openingCash ?? 0));

    const shift = await POSShift.create({
      registerId: input.registerId,
      openedBy: actor.id,
      openingCash,
      expectedCash: openingCash,
      openedAt: new Date(),
    });

    return successResponse(
      shift,
      "POS shift opened.",
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
