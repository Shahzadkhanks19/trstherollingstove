import { Types } from "mongoose";

import { AppError } from "@/lib/errors/AppError";
import { nextOrderNumber } from "@/lib/orders/order-number";
import { Order } from "@/models/Order";
import { POSCashMovement } from "@/models/POSCashMovement";
import { POSShift } from "@/models/POSShift";
import { User } from "@/models/User";
import { getOrCreateInvoice } from "@/services/invoice.service";
import {
  publishDashboardRefresh,
  publishOrderCreated,
} from "@/services/realtimeEvents.service";
import { publishRealtimeEventSafely } from "@/services/realtimePublisher.service";
import type { CreatePosOrderInput } from "@/services/pos-order.types";
import { money } from "@/services/pos-order.utils";
import { resolvePosOrderPayment } from "@/services/pos-order-payment.service";
import { createPersistedPosOrder } from "@/services/pos-order-persistence.service";
import { markPosInvoicePrinted } from "@/services/pos-order-invoice.service";
import { assertPosInventoryAvailable, deductPosInventory } from "@/services/pos-order-inventory.service";
import { createPosKitchenOutput } from "@/services/pos-order-kitchen.service";
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

  try {
    if (!isInternalOrder && cashPaid > 0) {
      await POSCashMovement.create({
        shiftId: shift._id,
        type: "cash_sale",
        amount: cashPaid,
        reason: `Cash sale ${orderNumber}`,
        referenceType: "order",
        referenceId: order._id,
        createdBy: new Types.ObjectId(actorId),
      });
      await POSShift.updateOne(
        { _id: shift._id },
        { $inc: { expectedCash: cashPaid } },
      );
    }

    await deductPosInventory(orderLines, order._id, actorId);
    await createPosKitchenOutput(order, orderLines, actorId);
    const invoice = await getOrCreateInvoice(String(order._id), actorId);

    publishOrderCreated({
      orderId: String(order._id),
      orderNumber,
      customerId: order.customerId?.toString(),
      status: order.status,
      paymentStatus: order.paymentStatus,
      grandTotal,
      orderMode: order.orderMode,
      actorId,
    });
    publishRealtimeEventSafely({
      event: "pos.order_created",
      entityId: String(order._id),
      actorId,
      data: {
        orderId: String(order._id),
        orderNumber,
        grandTotal,
        paymentMethod: isInternalOrder ? "not_required" : input.paymentMethod,
        saleType: input.internalConsumption.saleType,
      },
      target: {
        roleKeys: ["super_admin", "admin", "manager", "cashier", "kitchen"],
      },
    });
    publishDashboardRefresh("pos.order_created", actorId);

    return { order, invoice };
  } catch (error) {
    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          status: "cancelled",
          cancelledAt: new Date(),
          cancellationReason: "POS finalization failed after order creation.",
        },
      },
    );
    throw error;
  }
}


export { markPosInvoicePrinted as markInvoicePrinted };
