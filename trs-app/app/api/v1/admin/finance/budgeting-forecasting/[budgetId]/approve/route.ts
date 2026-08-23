import { requirePermission } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { transitionBudgetPlan } from "@/services/budgeting-forecasting.service";
import { budgetApprovalSchema } from "@/validators/budgeting-forecasting";

export async function POST(request: Request, context: { params: Promise<{ budgetId: string }> }) {
  try {
    const actor = await requirePermission("reports.read");
    const { budgetId } = await context.params;
    const input = await validateRequestBody(request, budgetApprovalSchema);
    return successResponse(await transitionBudgetPlan(budgetId, input.action, actor.id, input.reason), "Budget workflow updated.");
  } catch (error) { return handleApiError(error); }
}
