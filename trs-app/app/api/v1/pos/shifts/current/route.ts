import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { POSShift } from "@/models/POSShift";
import {
  calculateTodayExpectedCash,
  getIndiaBusinessDayRange,
} from "@/services/pos.service";

export async function GET(request: Request) {
  try {
    const actor = await requirePermission("pos.use");
    await connectToDatabase();

    const url = new URL(request.url);
    const registerId = url.searchParams.get("registerId");
    const mineOnly = url.searchParams.get("mine") === "true";
    const { start, end } = getIndiaBusinessDayRange();

    const filter: Record<string, unknown> = {
      status: "open",
      openedAt: { $gte: start, $lt: end },
    };

    if (registerId) {
      filter.registerId = registerId;
    }

    if (mineOnly || actor.roleKey === "cashier") {
      filter.openedBy = actor.id;
    }

    const shift = await POSShift.findOne(filter)
      .sort({ openedAt: -1, createdAt: -1 })
      .populate("registerId", "name code locationLabel")
      .populate("openedBy", "name email")
      .lean();

    if (!shift) {
      return successResponse(null);
    }

    const expectedCash = await calculateTodayExpectedCash(String(shift._id));

    return successResponse({
      ...shift,
      expectedCash,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
