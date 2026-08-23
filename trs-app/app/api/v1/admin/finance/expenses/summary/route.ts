import { requirePermission } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { getExpenseSummary } from "@/services/expense-management.service";
import { expenseRangeSchema } from "@/validators/expense-management";
export async function GET(request: Request) { try { await requirePermission("reports.read"); const url = new URL(request.url); const { days } = expenseRangeSchema.parse({ days: url.searchParams.get("days") ?? 30 }); return successResponse(await getExpenseSummary(days), "Expense summary loaded."); } catch (error) { return handleApiError(error); } }
