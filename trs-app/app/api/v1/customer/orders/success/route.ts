import { requireAuthenticatedUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";

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
        items: 1,
        itemCount: 1,
        orderMode: 1,
        requestedPickupAt: 1,
        estimatedReadyAt: 1,
        status: 1,
        paymentStatus: 1,
        subtotal: 1,
        taxTotal: 1,
        discountTotal: 1,
        grandTotal: 1,
        coinsEarned: 1,
        customerSnapshot: 1,
        createdAt: 1,
      })
      .lean();

    if (!order) {
      throw new AppError("Order not found.", 404);
    }
    if (order.paymentStatus !== "paid") {
      throw new AppError("This order has not been paid yet.", 409);
    }

    const payment = await Payment.findOne({
      orderId: order._id,
      customerId: actor.id,
      status: { $in: ["captured", "authorized"] },
    })
      .sort({ capturedAt: -1, verifiedAt: -1, createdAt: -1 })
      .select({
        providerPaymentId: 1,
        amount: 1,
        currency: 1,
        method: 1,
        capturedAt: 1,
        verifiedAt: 1,
      })
      .lean();

    return successResponse(
      {
        order: {
          id: String(order._id),
          orderNumber: order.orderNumber,
          items: order.items.map((item) => ({
            id: String(item._id),
            name: item.name,
            quantity: item.quantity,
            variantName: item.variantName,
            lineTotal: item.lineTotal,
          })),
          itemCount: order.itemCount,
          orderMode: order.orderMode,
          requestedPickupAt: order.requestedPickupAt,
          estimatedReadyAt: order.estimatedReadyAt,
          status: order.status,
          paymentStatus: order.paymentStatus,
          subtotal: order.subtotal,
          taxTotal: order.taxTotal,
          discountTotal: order.discountTotal,
          grandTotal: order.grandTotal,
          coinsEarned: order.coinsEarned,
          customerName: order.customerSnapshot?.name ?? "Customer",
          customerPhone: order.customerSnapshot?.phone,
          createdAt: order.createdAt,
        },
        payment: payment
          ? {
              paymentId: payment.providerPaymentId,
              amount: payment.amount,
              currency: payment.currency,
              method: payment.method,
              paidAt: payment.capturedAt ?? payment.verifiedAt,
            }
          : null,
      },
      "Order success details loaded.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
