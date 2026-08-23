import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { Order } from "@/models/Order";

type Context = { params: Promise<{ orderId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    await requirePermission("orders.read");
    const { orderId } = await context.params;
    await connectToDatabase();

    const order = await Order.findById(orderId).lean();
    if (!order) throw new AppError("Order not found.", 404);
    return successResponse(order, "Order loaded.");
  } catch (error) {
    return handleApiError(error);
  }
}
