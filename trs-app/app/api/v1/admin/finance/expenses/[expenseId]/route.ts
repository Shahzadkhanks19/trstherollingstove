import { requirePermission } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { updateExpense } from "@/services/expense-management.service";
import { expenseUpdateSchema } from "@/validators/expense-management";
export async function PATCH(request: Request, { params }: { params: Promise<{ expenseId: string }> }) { try { const actor = await requirePermission("reports.read"); const input = await validateRequestBody(request, expenseUpdateSchema); const { expenseId } = await params; return successResponse(await updateExpense(expenseId, input, actor.id), "Expense updated."); } catch (error) { return handleApiError(error); } }
