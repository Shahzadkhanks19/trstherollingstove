import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { POSAuditEvent } from "@/models/POSAuditEvent";
import { POSRunningOrder } from "@/models/POSRunningOrder";
import { POSShift } from "@/models/POSShift";
import { calculateExpectedCash } from "@/services/pos.service";
import { getShiftReport } from "@/services/pos-operations.service";
import { publishDashboardRefresh } from "@/services/realtimeEvents.service";
import { publishRealtimeEventSafely } from "@/services/realtimePublisher.service";
import { closeShiftSchema } from "@/validators/pos";
import { Types } from "mongoose";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const actor = await requirePermission("pos.manage");
    const { id } = await context.params;
    const input = await validateRequestBody(request, closeShiftSchema);
    await connectToDatabase();

    const shift = await POSShift.findOne({ _id: id, status: "open" });
    if (!shift) throw new AppError("Open POS shift not found.", 404);

    const activeOrders = await POSRunningOrder.countDocuments({
      shiftId: shift._id,
      status: { $in: ["open", "sent_to_kitchen", "partially_paid"] },
    });
    if (activeOrders > 0) throw new AppError(`Close or transfer ${activeOrders} active running order(s) before closing the shift.`, 409);

    const expectedCash = await calculateExpectedCash(id);
    const report = await getShiftReport(id);
    const difference = input.countedCash - expectedCash;

    shift.status = "closed";
    shift.expectedCash = expectedCash;
    shift.countedCash = input.countedCash;
    shift.cashDifference = difference;
    shift.closingNote = input.closingNote;
    shift.closeApprovalNote = input.closeApprovalNote;
    shift.closeApprovedBy = new Types.ObjectId(actor.id);
    shift.closedBy = new Types.ObjectId(actor.id);
    shift.closedAt = new Date();
    shift.closeSnapshot = {
      orderCount: report.orderCount,
      grossSales: report.grossSales,
      refundsTotal: report.refundsTotal,
      cashSales: report.byMethod.cash ?? 0,
      upiSales: report.byMethod.upi ?? 0,
      cashMovementsNet: report.movements.reduce((sum, movement) => {
        if (movement.type === "cash_in" || movement.type === "cash_sale") {
          return sum + movement.amount;
        }
        if (movement.type === "cash_out" || movement.type === "cash_refund") {
          return sum - movement.amount;
        }
        return sum;
      }, 0),
    };
    await shift.save();

    await POSAuditEvent.create({
      actorId: new Types.ObjectId(actor.id),
      action: "shift.closed",
      entityType: "shift",
      entityId: shift._id,
      reason: input.closeApprovalNote || input.closingNote,
      before: { status: "open", expectedCash },
      after: { status: "closed", countedCash: input.countedCash, difference, closeSnapshot: shift.closeSnapshot },
    });

    publishRealtimeEventSafely({
      event: "pos.shift_reconciled",
      entityId: String(shift._id),
      actorId: actor.id,
      data: { expectedCash, countedCash: input.countedCash, difference },
      target: { roleKeys: ["super_admin", "admin", "manager", "cashier"] },
    });
    publishDashboardRefresh("pos.shift_closed", actor.id);

    return successResponse(shift, "POS shift closed and reconciled.");
  } catch (error) {
    return handleApiError(error);
  }
}
