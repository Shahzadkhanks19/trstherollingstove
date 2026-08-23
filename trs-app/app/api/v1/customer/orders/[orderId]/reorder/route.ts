import { requireAuthenticatedUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { reorderCustomerOrder } from "@/services/customer-orders.service";
import { requirePublicOrderingEnabled } from "@/lib/public-ordering";

type Context = { params: Promise<{ orderId: string }> };

export async function POST(_request: Request, context: Context) {
  try {
    await requirePublicOrderingEnabled();
    const actor = await requireAuthenticatedUser();
    if (actor.roleKey !== "customer") {
      throw new AppError("Customer access required.", 403);
    }

    const { orderId } = await context.params;
    await connectToDatabase();

    const result = await reorderCustomerOrder({
      customerId: actor.id,
      orderId,
    });

    return successResponse(result, "Available items were added to your cart.");
  } catch (error) {
    return handleApiError(error);
  }
}
