import { requirePermission } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { buildExpenseSnapshot } from "@/services/expense-management.service";
import { expenseRebuildSchema } from "@/validators/expense-management";
export async function POST(request: Request) { try { const actor = await requirePermission("reports.read"); const input = await validateRequestBody(request, expenseRebuildSchema); return successResponse(await buildExpenseSnapshot({ ...input, generatedBy: actor.id }), "Expense snapshot rebuilt."); } catch (error) { return handleApiError(error); } }
