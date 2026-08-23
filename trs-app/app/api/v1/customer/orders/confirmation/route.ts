import { requireAuthenticatedUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { Order } from "@/models/Order";

const VISIBLE_KITCHEN_STATUSES = ["placed", "accepted", "preparing", "ready", "completed"] as const;

function startOfBusinessDay(value: Date) {
  const start = new Date(value);
  start.setHours(0, 0, 0, 0);
  return start;
}

export async function GET(request: Request) {
  try {
    const actor = await requireAuthenticatedUser();
    if (actor.roleKey !== "customer") {
      throw new AppError("Customer access required.", 403);
    }

    const url = new URL(request.url);
    const orderNumber = url.searchParams.get("order")?.trim().toUpperCase() ?? "";
    if (!orderNumber) {
      throw new AppError("Order number is required.", 400);
    }

    await connectToDatabase();

    const order = await Order.findOne({
      orderNumber,
      customerId: actor.id,
    })
      .select({
        orderNumber: 1,
        orderMode: 1,
        requestedPickupAt: 1,
        estimatedReadyAt: 1,
        status: 1,
        paymentStatus: 1,
        itemCount: 1,
        grandTotal: 1,
        createdAt: 1,
      })
      .lean();

    if (!order) {
      throw new AppError("Order not found.", 404);
    }
    if (order.paymentStatus !== "paid") {
      throw new AppError("This order has not been paid and confirmed yet.", 409);
    }

    const createdAt = new Date(order.createdAt);
    const dayStart = startOfBusinessDay(createdAt);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    // The sequence is stable because it includes all paid orders created up to this order,
    // including orders that may later be cancelled or completed.
    const queueNumber = await Order.countDocuments({
      paymentStatus: "paid",
      createdAt: { $gte: dayStart, $lt: dayEnd, $lte: createdAt },
    });

    return successResponse(
      {
        order: {
          id: String(order._id),
          orderNumber: order.orderNumber,
          orderMode: order.orderMode,
          requestedPickupAt: order.requestedPickupAt,
          estimatedReadyAt: order.estimatedReadyAt,
          status: order.status,
          paymentStatus: order.paymentStatus,
          itemCount: order.itemCount,
          grandTotal: order.grandTotal,
          queueNumber: Math.max(queueNumber, 1),
          isInKitchen: VISIBLE_KITCHEN_STATUSES.includes(
            order.status as (typeof VISIBLE_KITCHEN_STATUSES)[number],
          ),
          createdAt: order.createdAt,
        },
      },
      "Order confirmation loaded.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
