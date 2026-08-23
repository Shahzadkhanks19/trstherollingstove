import { requireAuthenticatedUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { createRazorpayPaymentOrder } from "@/services/payment.service";
import { createPaymentOrderSchema } from "@/validators/payment";
import { requirePublicOrderingEnabled } from "@/lib/public-ordering";

export async function POST(request: Request) {
  try {
    await requirePublicOrderingEnabled();
    const actor = await requireAuthenticatedUser();
    if (actor.roleKey !== "customer") {
      throw new AppError("Customer access required.", 403);
    }

    const input = await validateRequestBody(
      request,
      createPaymentOrderSchema,
    );
    await connectToDatabase();

    const result = await createRazorpayPaymentOrder({
      orderId: input.orderId,
      customerId: actor.id,
    });

    return successResponse(result, "Payment order created.", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
