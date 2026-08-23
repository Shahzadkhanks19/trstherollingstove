import { Types } from "mongoose";

import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { Order } from "@/models/Order";
import { KitchenTicket } from "@/models/KitchenTicket";
import { writeAuditLog } from "@/services/audit.service";
import {
  earnCoinsForOrder,
  refundRedeemedCoins,
} from "@/services/rewards.service";
import { orderStatusUpdateSchema } from "@/validators/order";
import { publishOrderStatusChanged } from "@/services/realtimeEvents.service";
import { completeKitchenTicketsForOrder } from "@/services/kds.service";

type Context = { params: Promise<{ orderId: string }> };

const allowedTransitions: Record<string, string[]> = {
  placed: ["accepted", "cancelled", "rejected"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["completed"],
  completed: [],
  cancelled: [],
  rejected: [],
};

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requirePermission("orders.manage");
    const { orderId } = await context.params;
    const input = await validateRequestBody(request, orderStatusUpdateSchema);
    await connectToDatabase();

    const order = await Order.findById(orderId);
    if (!order) throw new AppError("Order not found.", 404);

    const isEtaOnlyUpdate = input.status === order.status && input.estimatedReadyAt !== undefined;
    if (!isEtaOnlyUpdate && !allowedTransitions[order.status]?.includes(input.status)) {
      throw new AppError(
        `Order cannot move from ${order.status} to ${input.status}.`,
        409,
      );
    }

    const now = new Date();
    const previousStatus = order.status;
    if (!isEtaOnlyUpdate) order.status = input.status;
    order.updatedBy = new Types.ObjectId(actor.id);
    order.statusHistory.push({
      status: order.status,
      note: input.note,
      changedBy: new Types.ObjectId(actor.id),
      changedAt: now,
    });

    if (input.estimatedReadyAt !== undefined) {
      order.estimatedReadyAt = input.estimatedReadyAt ? new Date(input.estimatedReadyAt) : null;
      await KitchenTicket.updateMany(
        { orderId: order._id, status: { $nin: ["served", "cancelled"] } },
        { $set: { estimatedReadyAt: order.estimatedReadyAt } },
      );
    }

    if (input.status === "accepted") order.acceptedAt = now;
    if (input.status === "preparing") order.preparingAt = now;
    if (input.status === "ready") order.readyAt = now;

    if (input.status === "completed") {
      order.completedAt = now;

      if (order.paymentStatus !== "paid") {
        throw new AppError("TRS Coins can only be awarded after payment is confirmed as paid.", 409);
      }

      if (order.customerId && !order.coinsAwardedAt) {
        const transaction = await earnCoinsForOrder({
          customerId: order.customerId.toString(),
          orderId: order.id,
          eligibleAmount: order.loyaltyEligibleAmount,
          actorId: actor.id,
        });

        if (transaction) {
          order.coinsEarned = Math.max(0, transaction.amount);
          order.coinsAwardedAt = now;
        }
      }
    }

    if (input.status === "cancelled" || input.status === "rejected") {
      order.cancelledAt = now;
      order.cancellationReason = input.note;

      if (
        order.customerId &&
        order.coinsRedeemed > 0 &&
        !order.redeemedCoinsRefundedAt
      ) {
        await refundRedeemedCoins({
          customerId: order.customerId.toString(),
          orderId: order.id,
          coins: order.coinsRedeemed,
          actorId: actor.id,
        });
        order.redeemedCoinsRefundedAt = now;
      }
    }

    await order.save();

    if (input.status === "completed") {
      await completeKitchenTicketsForOrder(order.id, actor.id);
    }

    await writeAuditLog({
      actorUserId: actor.id,
      action: "order.status_updated",
      entityType: "order",
      entityId: order.id,
      description: `Order ${order.orderNumber} moved to ${input.status}.`,
    });

    publishOrderStatusChanged({
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId?.toString(),
      previousStatus,
      status: order.status,
      actorId: actor.id,
    });

    return successResponse(order, "Order status updated.");
  } catch (error) {
    return handleApiError(error);
  }
}
