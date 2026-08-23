import { requireAuthenticatedUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { getCustomerDashboardSummary } from "@/services/customer-dashboard.service";

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    if (user.roleKey !== "customer") throw new AppError("Customer access required.", 403);
    return successResponse(await getCustomerDashboardSummary(user.id), "Dashboard loaded.");
  } catch (error) {
    return handleApiError(error);
  }
}
