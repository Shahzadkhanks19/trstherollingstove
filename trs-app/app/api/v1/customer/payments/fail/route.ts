import { requireAuthenticatedUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { markRazorpayPaymentFailed } from "@/services/payment.service";
import { failPaymentSchema } from "@/validators/payment";

export async function POST(request: Request) {
  try {
    const actor = await requireAuthenticatedUser();
    if (actor.roleKey !== "customer") {
      throw new AppError("Customer access required.", 403);
    }

    const input = await validateRequestBody(request, failPaymentSchema);
    await connectToDatabase();

    const payment = await markRazorpayPaymentFailed({
      customerId: actor.id,
      ...input,
    });

    return successResponse(payment, "Payment failure recorded.");
  } catch (error) {
    return handleApiError(error);
  }
}
