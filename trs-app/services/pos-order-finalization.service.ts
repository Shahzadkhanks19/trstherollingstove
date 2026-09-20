import { Types } from "mongoose";

import { getOrCreateInvoice } from "@/services/invoice.service";
import { Order } from "@/models/Order";
import { POSCashMovement } from "@/models/POSCashMovement";
import { POSShift } from "@/models/POSShift";
import {
  publishDashboardRefresh,
  publishOrderCreated,
} from "@/services/realtimeEvents.service";
import { publishRealtimeEventSafely } from "@/services/realtimePublisher.service";
import { deductPosInventory } from "@/services/pos-order-inventory.service";
import { createPosKitchenOutput } from "@/services/pos-order-kitchen.service";
import type {
  CreatePosOrderInput,
  ResolvedPosLine,
} from "@/services/pos-order.types";

type FinalizePosOrderInput = {
  input: CreatePosOrderInput;
  actorId: string;
  shiftId: Types.ObjectId;
  order: InstanceType<typeof Order>;
  orderLines: ResolvedPosLine[];
  orderNumber: string;
  grandTotal: number;
  cashPaid: number;
  isInternalOrder: boolean;
};

export async function finalizePosOrder({
  input,
  actorId,
  shiftId,
  order,
  orderLines,
  orderNumber,
  grandTotal,
  cashPaid,
  isInternalOrder,
}: FinalizePosOrderInput) {
  try {
    if (!isInternalOrder && cashPaid > 0) {
      await POSCashMovement.create({
        shiftId,
        type: "cash_sale",
        amount: cashPaid,
        reason: `Cash sale ${orderNumber}`,
        referenceType: "order",
        referenceId: order._id,
        createdBy: new Types.ObjectId(actorId),
      });
      await POSShift.updateOne(
        { _id: shiftId },
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

    return invoice;
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
