import { Types } from "mongoose";

import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { Order } from "@/models/Order";
import { writeAuditLog } from "@/services/audit.service";
import { publishPaymentUpdated } from "@/services/realtimeEvents.service";
import { paymentStatusUpdateSchema } from "@/validators/order";

type Context = { params: Promise<{ orderId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requirePermission("payments.manage");
    const { orderId } = await context.params;
    const input = await validateRequestBody(request, paymentStatusUpdateSchema);
    await connectToDatabase();

    const order = await Order.findById(orderId);
    if (!order) throw new AppError("Order not found.", 404);

    const nextPaymentMethod = input.paymentMethod ?? order.paymentMethod;
    if (
      nextPaymentMethod === "online" &&
      ["paid", "refunded"].includes(input.paymentStatus)
    ) {
      throw new AppError(
        "Online payments and refunds must be verified through Razorpay.",
        409,
      );
    }

    order.paymentStatus = input.paymentStatus;
    if (input.paymentMethod !== undefined) order.paymentMethod = input.paymentMethod;
    order.updatedBy = new Types.ObjectId(actor.id);
    await order.save();

    await writeAuditLog({
      actorUserId: actor.id,
      action: "order.payment_updated",
      entityType: "order",
      entityId: order.id,
      description: `Payment status for ${order.orderNumber} changed to ${input.paymentStatus}.`,
    });

    publishPaymentUpdated({
      paymentId: order.id,
      orderId: order.id,
      status: order.paymentStatus,
      actorId: actor.id,
    });

    return successResponse(order, "Payment status updated.");
  } catch (error) {
    return handleApiError(error);
  }
}
