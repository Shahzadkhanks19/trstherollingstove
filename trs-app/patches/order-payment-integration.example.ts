/**
 * Call this after a successful cash payment is recorded.
 * Adapt the property names to your existing Payment/Order service.
 */

import { POSCashMovement } from "@/models/POSCashMovement";
import { POSShift } from "@/models/POSShift";
import { calculateExpectedCash } from "@/services/pos.service";

export async function recordPosCashSale(input: {
  shiftId: string;
  orderId: string;
  paymentId?: string;
  amount: number;
  actorId: string;
}) {
  const shift = await POSShift.findOne({
    _id: input.shiftId,
    status: "open",
  });

  if (!shift) {
    throw new Error("An open POS shift is required.");
  }

  await POSCashMovement.create({
    shiftId: input.shiftId,
    type: "cash_sale",
    amount: input.amount,
    reason: "POS cash order payment",
    referenceType: input.paymentId
      ? "payment"
      : "order",
    referenceId: input.paymentId ?? input.orderId,
    createdBy: input.actorId,
  });

  shift.expectedCash = await calculateExpectedCash(
    input.shiftId,
  );
  await shift.save();
}
