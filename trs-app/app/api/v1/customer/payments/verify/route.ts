import { requireAuthenticatedUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { confirmRazorpayPayment } from "@/services/payment.service";
import { verifyPaymentSchema } from "@/validators/payment";

export async function POST(request: Request) {
  try {
    const actor = await requireAuthenticatedUser();
    if (actor.roleKey !== "customer") {
      throw new AppError("Customer access required.", 403);
    }

    const input = await validateRequestBody(request, verifyPaymentSchema);
    await connectToDatabase();

    const payment = await confirmRazorpayPayment({
      customerId: actor.id,
      ...input,
    });


    return successResponse(payment, "Payment verified.");
  } catch (error) {
    return handleApiError(error);
  }
}
