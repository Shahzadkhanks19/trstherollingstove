import { Types } from "mongoose";

import { AppError } from "@/lib/errors/AppError";
import { nextOrderNumber } from "@/lib/orders/order-number";
import { POSShift } from "@/models/POSShift";
import { finalizePosOrder } from "@/services/pos-order-finalization.service";
import { User } from "@/models/User";
import type { CreatePosOrderInput } from "@/services/pos-order.types";
import { money } from "@/services/pos-order.utils";
import { resolvePosOrderPayment } from "@/services/pos-order-payment.service";
import { createPersistedPosOrder } from "@/services/pos-order-persistence.service";
import { markPosInvoicePrinted } from "@/services/pos-order-invoice.service";
import { assertPosInventoryAvailable } from "@/services/pos-order-inventory.service";
import { validatePosInternalConsumption } from "@/services/pos-order-internal-consumption.service";
import { resolvePosOrderLines } from "@/services/pos-order-lines.service";

export async function createPosOrder(
  input: CreatePosOrderInput,
  actorId: string,
) {
  const shift = await POSShift.findOne({
    _id: input.shiftId,
    status: "open",
    openedBy: new Types.ObjectId(actorId),
  }).lean();
  if (!shift)
    throw new AppError("Open POS shift not found for this cashier.", 409);

  const internalApproval = await validatePosInternalConsumption(
    input.internalConsumption,
  );
  const { isInternalOrder } = internalApproval;

  const customer =
    !isInternalOrder && input.customerId
      ? await User.findOne({ _id: input.customerId, deletedAt: null })
          .select("name phone email")
          .lean()
      : null;
  if (input.customerId && !customer)
    throw new AppError("Selected customer is no longer available.", 409);

  const orderLines = await resolvePosOrderLines(input);

  const subtotal = money(
    orderLines.reduce((sum, item) => sum + item.lineTotal, 0),
  );
  const {
    adjustments,
    discountTotal,
    taxTotal,
    grandTotal,
    waivedAmount,
    tipAmount,
    paymentBreakdown,
    cashPaid,
    amountTendered,
    changeDue,
  } = resolvePosOrderPayment(input, subtotal, isInternalOrder);

  await assertPosInventoryAvailable(orderLines);

  const orderNumber = await nextOrderNumber();
  const order = await createPersistedPosOrder({
    input,
    actorId,
    shift,
    customer,
    orderLines,
    subtotal,
    adjustments,
    discountTotal,
    taxTotal,
    grandTotal,
    waivedAmount,
    tipAmount,
    paymentBreakdown,
    amountTendered,
    changeDue,
    internalApproval,
    orderNumber,
  });

  const invoice = await finalizePosOrder({
    input,
    actorId,
    shiftId: shift._id,
    order,
    orderLines,
    orderNumber,
    grandTotal,
    cashPaid,
    isInternalOrder,
  });

  return { order, invoice };
}

export { markPosInvoicePrinted as markInvoicePrinted };
