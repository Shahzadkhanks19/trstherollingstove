import { requirePermission } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { updateBudgetPlan } from "@/services/budgeting-forecasting.service";
import { budgetUpdateSchema } from "@/validators/budgeting-forecasting";

export async function PATCH(request: Request, context: { params: Promise<{ budgetId: string }> }) {
  try {
    await requirePermission("reports.read");
    const { budgetId } = await context.params;
    const input = await validateRequestBody(request, budgetUpdateSchema);
    return successResponse(await updateBudgetPlan(budgetId, input), "Budget plan updated.");
  } catch (error) { return handleApiError(error); }
}
