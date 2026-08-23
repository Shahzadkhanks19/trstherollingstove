import { requireAuthenticatedUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { createOrderFromCart } from "@/services/order.service";
import { checkoutSchema } from "@/validators/order";
import { requirePublicOrderingEnabled } from "@/lib/public-ordering";

export async function POST(request: Request) {
  try {
    await requirePublicOrderingEnabled();
    const actor = await requireAuthenticatedUser();
    if (actor.roleKey !== "customer") {
      throw new AppError("Customer access required.", 403);
    }

    const input = await validateRequestBody(request, checkoutSchema);
    await connectToDatabase();

    const order = await createOrderFromCart({
      customerId: actor.id,
      ...input,
    });

    return successResponse(order, "Order placed successfully.", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
