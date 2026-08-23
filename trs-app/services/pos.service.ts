import { Types } from "mongoose";
import { AppError } from "@/lib/errors/AppError";
import { POSCashMovement } from "@/models/POSCashMovement";
import { POSRegister } from "@/models/POSRegister";
import { POSShift } from "@/models/POSShift";

export function getIndiaBusinessDayRange(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type == "year")?.value);
  const month = Number(parts.find((part) => part.type == "month")?.value);
  const day = Number(parts.find((part) => part.type == "day")?.value);

  // India is UTC+05:30. Constructing from UTC components avoids dependence
  // on the VPS/Node process timezone.
  const start = new Date(Date.UTC(year, month - 1, day, -5, -30, 0, 0));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return { start, end };
}

export async function calculateTodayExpectedCash(
  shiftId: string | Types.ObjectId,
) {
  const shift = await POSShift.findById(shiftId).lean();

  if (!shift) {
    throw new AppError("POS shift not found.", 404);
  }

  const { start, end } = getIndiaBusinessDayRange();
  const openedAt = new Date(shift.openedAt);

  // A shift from a previous India business day must never contribute to
  // today's drawer, even when somebody forgot to close it.
  if (openedAt < start || openedAt >= end) {
    return 0;
  }

  const totals = await POSCashMovement.aggregate<{
    _id: string;
    total: number;
  }>([
    {
      $match: {
        shiftId: new Types.ObjectId(String(shiftId)),
        createdAt: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
      },
    },
  ]);

  const amountByType = Object.fromEntries(
    totals.map((item) => [item._id, Number(item.total ?? 0)]),
  );

  return Math.round(
    Number(shift.openingCash ?? 0) +
      (amountByType.cash_in ?? 0) +
      (amountByType.cash_sale ?? 0) -
      (amountByType.cash_out ?? 0) -
      (amountByType.cash_refund ?? 0),
  );
}

export async function calculateExpectedCash(
  shiftId: string | Types.ObjectId,
) {
  const shift = await POSShift.findById(shiftId).lean();

  if (!shift) {
    throw new AppError("POS shift not found.", 404);
  }

  const totals = await POSCashMovement.aggregate<{
    _id: string;
    total: number;
  }>([
    {
      $match: {
        shiftId: new Types.ObjectId(String(shiftId)),
      },
    },
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
      },
    },
  ]);

  const amountByType = Object.fromEntries(
    totals.map((item) => [item._id, item.total]),
  );

  return (
    shift.openingCash +
    (amountByType.cash_in ?? 0) +
    (amountByType.cash_sale ?? 0) -
    (amountByType.cash_out ?? 0) -
    (amountByType.cash_refund ?? 0)
  );
}

export async function getOpenShiftForRegister(
  registerId: string,
) {
  return POSShift.findOne({
    registerId,
    status: "open",
  })
    .populate("registerId", "name code locationLabel")
    .populate("openedBy", "name email")
    .lean();
}

export async function assertActiveRegister(
  registerId: string,
) {
  const register = await POSRegister.findOne({
    _id: registerId,
    isActive: true,
  });

  if (!register) {
    throw new AppError(
      "Active POS register not found.",
      404,
    );
  }

  return register;
}
