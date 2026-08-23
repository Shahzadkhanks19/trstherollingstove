import { isValidObjectId } from "mongoose";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { Order } from "@/models/Order";

export async function GET(request: Request) {
  try {
    const actor = await requireAuthenticatedUser();
    if (actor.roleKey !== "customer") {
      throw new AppError("Customer access required.", 403);
    }

    const url = new URL(request.url);
    const orderReference = url.searchParams.get("order")?.trim();
    if (!orderReference) {
      throw new AppError("Order reference is required.", 400);
    }

    await connectToDatabase();

    const referenceFilter = isValidObjectId(orderReference)
      ? { $or: [{ _id: orderReference }, { orderNumber: orderReference }] }
      : { orderNumber: orderReference };

    const order = await Order.findOne({
      customerId: actor.id,
      ...referenceFilter,
    })
      .select(
        "orderNumber status paymentStatus orderMode items coinsEarned grandTotal completedAt createdAt",
      )
      .lean();

    if (!order) {
      throw new AppError("Order not found.", 404);
    }

    if (order.paymentStatus !== "paid") {
      throw new AppError("This order does not have a confirmed payment.", 409);
    }

    if (order.status !== "completed") {
      throw new AppError("This order has not been completed yet.", 409);
    }

    return successResponse(
      {
        id: String(order._id),
        orderNumber: order.orderNumber,
        orderMode: order.orderMode,
        status: order.status,
        amountPaid: order.grandTotal,
        coinsEarned: order.coinsEarned ?? 0,
        completedAt: order.completedAt?.toISOString() ?? null,
        itemCount: order.items.reduce((total, item) => total + item.quantity, 0),
        items: order.items.map((item) => ({
          id: String(item._id),
          menuItemId: String(item.menuItemId),
          name: item.name,
          variantName: item.variantName,
          quantity: item.quantity,
        })),
      },
      "Completed order loaded.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
