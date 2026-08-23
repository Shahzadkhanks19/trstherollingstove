import { requireAuthenticatedUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { getCustomerPaymentStatus } from "@/services/payment.service";

export async function GET(request: Request) {
  try {
    const actor = await requireAuthenticatedUser();
    if (actor.roleKey !== "customer") throw new AppError("Customer access required.", 403);

    const orderId = new URL(request.url).searchParams.get("orderId") ?? "";
    if (!/^[a-f\d]{24}$/i.test(orderId)) throw new AppError("Invalid order identifier.", 400);

    await connectToDatabase();
    const result = await getCustomerPaymentStatus({ orderId, customerId: actor.id });
    return successResponse(result, "Payment status loaded.");
  } catch (error) {
    return handleApiError(error);
  }
}
