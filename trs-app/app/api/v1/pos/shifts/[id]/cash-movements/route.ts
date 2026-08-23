import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { POSCashMovement } from "@/models/POSCashMovement";
import { POSShift } from "@/models/POSShift";
import { calculateTodayExpectedCash } from "@/services/pos.service";
import { createCashMovementSchema } from "@/validators/pos";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  context: Context,
) {
  try {
    await requirePermission("pos.use");
    const { id } = await context.params;
    await connectToDatabase();

    const movements = await POSCashMovement.find({
      shiftId: id,
    })
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(movements);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: Request,
  context: Context,
) {
  try {
    const actor = await requirePermission("pos.use");
    const { id } = await context.params;
    const input = await validateRequestBody(
      request,
      createCashMovementSchema,
    );

    await connectToDatabase();

    const shift = await POSShift.findOne({
      _id: id,
      status: "open",
    });

    if (!shift) {
      throw new AppError(
        "Open POS shift not found.",
        404,
      );
    }

    const movement = await POSCashMovement.create({
      shiftId: id,
      ...input,
      referenceType: "manual",
      createdBy: actor.id,
    });

    shift.expectedCash = await calculateTodayExpectedCash(id);
    await shift.save();

    return successResponse(
      { movement, expectedCash: shift.expectedCash },
      "Cash movement recorded.",
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
