import { requirePermission } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { reverseManagedPayment } from "@/services/payment-management.service";
import { paymentReverseSchema } from "@/validators/payment-management";

type Context = { params: Promise<{ paymentId: string }> };
export async function POST(request: Request, context: Context) {
  try {
    const actor = await requirePermission("payments.manage");
    const { paymentId } = await context.params;
    const input = await validateRequestBody(request, paymentReverseSchema);
    return successResponse(await reverseManagedPayment(paymentId, input, actor.id), "Payment reversed.");
  } catch (error) {
    return handleApiError(error);
  }
}
