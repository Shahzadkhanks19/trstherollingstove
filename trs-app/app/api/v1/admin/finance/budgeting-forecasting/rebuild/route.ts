import { requirePermission } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { buildBudgetForecastSnapshot } from "@/services/budgeting-forecasting.service";
import { budgetForecastRebuildSchema } from "@/validators/budgeting-forecasting";

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("reports.read");
    const input = await validateRequestBody(request, budgetForecastRebuildSchema);
    return successResponse(await buildBudgetForecastSnapshot({ fiscalYear:input.fiscalYear, scenario:input.scenario, department:input.department, source:input.source, generatedBy:actor.id }), "Budget forecast rebuilt.");
  } catch (error) { return handleApiError(error); }
}
