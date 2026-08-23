import { isValidObjectId } from "mongoose";
import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { POSCashMovement } from "@/models/POSCashMovement";
import { POSShift } from "@/models/POSShift";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function indiaDateRange(value: string, endOfDay = false) {
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (!valid) return null;
  return new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+05:30`);
}

export async function GET(request: Request) {
  try {
    const actor = await requirePermission("pos.use");
    await connectToDatabase();

    const url = new URL(request.url);
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const defaultFrom = new Date(`${today}T00:00:00.000+05:30`);
    defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 29);

    const from = indiaDateRange(url.searchParams.get("from") ?? "") ?? defaultFrom;
    const to = indiaDateRange(url.searchParams.get("to") ?? "", true) ?? indiaDateRange(today, true)!;
    const status = url.searchParams.get("status");
    const registerId = url.searchParams.get("registerId");
    const cashierId = url.searchParams.get("cashierId");
    const search = url.searchParams.get("search")?.trim().toLowerCase() ?? "";
    const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") ?? 150)));

    const filter: Record<string, unknown> = { openedAt: { $gte: from, $lte: to } };
    if (status === "open" || status === "closed") filter.status = status;
    if (registerId && isValidObjectId(registerId)) filter.registerId = registerId;
    if (actor.roleKey === "cashier") filter.openedBy = actor.id;
    else if (cashierId && isValidObjectId(cashierId)) filter.openedBy = cashierId;

    const shifts = await POSShift.find(filter)
      .populate("registerId", "name code locationLabel")
      .populate("openedBy", "name email")
      .populate("closedBy", "name email")
      .sort({ openedAt: -1 })
      .limit(limit)
      .lean();

    const ids = shifts.map((shift) => shift._id);
    const movements = ids.length
      ? await POSCashMovement.find({ shiftId: { $in: ids } })
          .populate("createdBy", "name email")
          .sort({ createdAt: 1 })
          .lean()
      : [];

    const movementMap = new Map<string, typeof movements>();
    for (const movement of movements) {
      const key = String(movement.shiftId);
      const list = movementMap.get(key) ?? [];
      list.push(movement);
      movementMap.set(key, list);
    }

    const rows = shifts.map((shift) => {
      const shiftMovements = movementMap.get(String(shift._id)) ?? [];
      let runningBalance = Number(shift.openingCash ?? 0);
      const movementsWithBalance = shiftMovements.map((movement) => {
        const amount = Number(movement.amount ?? 0);
        const positive = movement.type === "cash_in" || movement.type === "cash_sale";
        runningBalance += positive ? amount : -amount;
        return { ...movement, runningBalance: Math.round(runningBalance * 100) / 100 };
      });
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
      const calculatedExpectedCash = Math.round((Number(shift.openingCash ?? 0) + totals.cashIn + totals.cashSales - totals.cashOut - totals.cashRefunds) * 100) / 100;
      return {
        ...shift,
        expectedCash: shift.status === "open" ? calculatedExpectedCash : Number(shift.expectedCash ?? calculatedExpectedCash),
        movements: movementsWithBalance,
        movementSummary: { openingCash: Number(shift.openingCash ?? 0), ...totals, manualNet: totals.cashIn - totals.cashOut, calculatedExpectedCash },
      };
    }).filter((shift) => {
      if (!search) return true;
      const populated = shift as typeof shift & {
        registerId?: { name?: string; code?: string } | string;
        openedBy?: { name?: string; email?: string } | string;
      };
      const register =
        typeof populated.registerId === "object" && populated.registerId
          ? `${populated.registerId.name ?? ""} ${populated.registerId.code ?? ""}`
          : "";
      const opener =
        typeof populated.openedBy === "object" && populated.openedBy
          ? `${populated.openedBy.name ?? ""} ${populated.openedBy.email ?? ""}`
          : "";
      const reasons = shift.movements.map((movement) => movement.reason ?? "").join(" ");
      return `${register} ${opener} ${shift.closingNote ?? ""} ${reasons}`
        .toLowerCase()
        .includes(search);
    });

    const summary = rows.reduce(
      (result, shift) => {
        result.registers += 1;
        if (shift.status === "open") result.open += 1;
        else result.closed += 1;
        result.openingCash += shift.movementSummary.openingCash;
        result.cashIn += shift.movementSummary.cashIn;
        result.cashOut += shift.movementSummary.cashOut;
        result.cashSales += shift.movementSummary.cashSales;
        result.cashRefunds += shift.movementSummary.cashRefunds;
        result.expectedCash += Number(shift.expectedCash ?? 0);
        result.countedCash += Number(shift.countedCash ?? 0);
        result.difference += Number(shift.cashDifference ?? 0);
        return result;
      },
      { registers: 0, open: 0, closed: 0, openingCash: 0, cashIn: 0, cashOut: 0, cashSales: 0, cashRefunds: 0, expectedCash: 0, countedCash: 0, difference: 0 },
    );

    return successResponse({ rows, summary, from: from.toISOString(), to: to.toISOString() });
  } catch (error) {
    return handleApiError(error);
  }
}
