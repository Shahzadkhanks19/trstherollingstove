import { requirePermission } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { reconcileManagedPayment } from "@/services/payment-management.service";
import { paymentReconciliationSchema } from "@/validators/payment-management";

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("payments.manage");
    const input = await validateRequestBody(request, paymentReconciliationSchema);
    return successResponse(await reconcileManagedPayment(input, actor.id), "Payment reconciled.", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
