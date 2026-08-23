import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { Order } from "@/models/Order";
import { z } from "zod";

const trackOrderSchema = z.object({
  orderId: z.string().trim().min(4).max(60).transform((value) => value.toUpperCase()),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter the registered 10-digit Indian mobile number."),
});

function formatTime(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(date);
}

export async function POST(request: Request) {
  try {
    const input = await validateRequestBody(request, trackOrderSchema);
    await connectToDatabase();

    const order = await Order.findOne({
      orderNumber: input.orderId,
      "customerSnapshot.phone": input.phone,
    }).lean();

    if (!order) throw new AppError("Order not found for the supplied details.", 404);

    const estimated = order.estimatedReadyAt ? new Date(order.estimatedReadyAt) : null;
    const estimatedReadyWindow = estimated && !Number.isNaN(estimated.getTime())
      ? `${formatTime(new Date(estimated.getTime() - 5 * 60_000))} – ${formatTime(new Date(estimated.getTime() + 5 * 60_000))}`
      : undefined;

    return successResponse({
      orderId: order.orderNumber,
      entityId: String(order._id),
      orderType: order.orderMode === "dine_in" ? "dine-in" : "takeaway",
      status: order.status,
      placedAt: formatTime(order.createdAt) ?? "—",
      acceptedAt: formatTime(order.acceptedAt),
      preparingAt: formatTime(order.preparingAt),
      readyAt: formatTime(order.readyAt),
      completedAt: formatTime(order.completedAt),
      estimatedReadyWindow,
      items: order.items.map((item) => ({
        id: String(item._id),
        name: item.name,
        variant: [item.variantName, ...item.modifiers.map((modifier) => modifier.optionName)].filter(Boolean).join(" · "),
        quantity: item.quantity,
        unitPrice: item.lineUnitPrice,
      })),
      subtotal: order.subtotal,
      coinDiscount: order.coinDiscount,
      total: order.grandTotal,
    }, "Order tracking details loaded.");
  } catch (error) {
    return handleApiError(error);
  }
}
