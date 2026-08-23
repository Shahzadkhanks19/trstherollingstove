import { requirePermission } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { buildPaymentManagementSnapshot } from "@/services/payment-management.service";
import { paymentManagementRebuildSchema } from "@/validators/payment-management";

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("payments.read");
    const input = await validateRequestBody(request, paymentManagementRebuildSchema);
    return successResponse(
      await buildPaymentManagementSnapshot({ days: input.days, source: input.source, generatedBy: actor.id }),
      "Payment-management snapshot rebuilt.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
