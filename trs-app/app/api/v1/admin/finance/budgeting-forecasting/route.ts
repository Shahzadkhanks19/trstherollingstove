import { requirePermission } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { createBudgetPlan } from "@/services/budgeting-forecasting.service";
import { budgetCreateSchema } from "@/validators/budgeting-forecasting";

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("reports.read");
    const input = await validateRequestBody(request, budgetCreateSchema);
    return successResponse(await createBudgetPlan(input, actor.id), "Budget plan created.");
  } catch (error) { return handleApiError(error); }
}
