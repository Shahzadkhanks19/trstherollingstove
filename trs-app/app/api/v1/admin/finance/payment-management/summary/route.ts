import { requirePermission } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { getPaymentManagementSummary } from "@/services/payment-management.service";
import { paymentManagementRangeSchema } from "@/validators/payment-management";

export async function GET(request: Request) {
  try {
    await requirePermission("payments.read");
    const url = new URL(request.url);
    const { days } = paymentManagementRangeSchema.parse({ days: url.searchParams.get("days") ?? 30 });
    return successResponse(await getPaymentManagementSummary(days));
  } catch (error) {
    return handleApiError(error);
  }
}
