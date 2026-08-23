import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { POSCashMovement } from "@/models/POSCashMovement";
import { POSShift } from "@/models/POSShift";
import { getIndiaBusinessDayRange } from "@/services/pos.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const actor = await requirePermission("pos.use");
    await connectToDatabase();

    const { start, end } = getIndiaBusinessDayRange();
    const shiftFilter: Record<string, unknown> = {
      openedAt: { $gte: start, $lt: end },
    };

    if (actor.roleKey === "cashier") {
      shiftFilter.openedBy = actor.id;
    }

    const shifts = await POSShift.find(shiftFilter)
      .populate("registerId", "name code locationLabel")
      .populate("openedBy", "name email")
      .populate("closedBy", "name email")
      .sort({ openedAt: -1 })
      .lean();

    const shiftIds = shifts.map((shift) => shift._id);
    const movements = shiftIds.length
      ? await POSCashMovement.find({ shiftId: { $in: shiftIds } })
          .populate("createdBy", "name email")
          .sort({ createdAt: 1 })
          .lean()
      : [];

    const movementsByShift = new Map<string, typeof movements>();
    for (const movement of movements) {
      const key = String(movement.shiftId);
      const current = movementsByShift.get(key) ?? [];
      current.push(movement);
      movementsByShift.set(key, current);
    }

    const result = shifts.map((shift) => {
      const shiftMovements = movementsByShift.get(String(shift._id)) ?? [];
      const totals = shiftMovements.reduce(
        (summary, movement) => {
          const amount = Number(movement.amount ?? 0);
          if (movement.type === "cash_in") summary.cashIn += amount;
          if (movement.type === "cash_out") summary.cashOut += amount;
          if (movement.type === "cash_sale") summary.cashSales += amount;
          if (movement.type === "cash_refund") summary.cashRefunds += amount;
          return summary;
        },
        { cashIn: 0, cashOut: 0, cashSales: 0, cashRefunds: 0 },
      );

      const calculatedExpectedCash = Math.round(
        Number(shift.openingCash ?? 0) +
          totals.cashIn +
          totals.cashSales -
          totals.cashOut -
          totals.cashRefunds,
      );

      return {
        ...shift,
        expectedCash:
          shift.status === "open"
            ? calculatedExpectedCash
            : Number(shift.expectedCash ?? calculatedExpectedCash),
        movements: shiftMovements,
        movementSummary: {
          openingCash: Number(shift.openingCash ?? 0),
          ...totals,
          manualNet: totals.cashIn - totals.cashOut,
          calculatedExpectedCash,
        },
      };
    });

    return successResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}
