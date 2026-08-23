import { requirePermission } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { getBudgetForecastSummary } from "@/services/budgeting-forecasting.service";
import { budgetForecastQuerySchema } from "@/validators/budgeting-forecasting";

export async function GET(request: Request) {
  try {
    await requirePermission("reports.read");
    const url = new URL(request.url);
    const input = budgetForecastQuerySchema.parse({ fiscalYear:url.searchParams.get("fiscalYear") ?? undefined, scenario:url.searchParams.get("scenario") ?? undefined, department:url.searchParams.get("department") ?? undefined });
    return successResponse(await getBudgetForecastSummary(input));
  } catch (error) { return handleApiError(error); }
}
