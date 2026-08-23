import { requirePermission } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { createExpense } from "@/services/expense-management.service";
import { expenseCreateSchema } from "@/validators/expense-management";
export async function POST(request: Request) { try { const actor = await requirePermission("reports.read"); const input = await validateRequestBody(request, expenseCreateSchema); return successResponse(await createExpense(input, actor.id), "Expense created.", 201); } catch (error) { return handleApiError(error); } }
