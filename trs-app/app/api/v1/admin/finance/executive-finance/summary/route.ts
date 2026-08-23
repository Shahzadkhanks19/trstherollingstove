import { requirePermission } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { getExecutiveFinanceSummary } from "@/services/executive-finance.service";
import { executiveFinanceQuerySchema } from "@/validators/executive-finance";

export async function GET(request: Request) {
  try {
    await requirePermission("reports.read");
    const url = new URL(request.url);
    const input = executiveFinanceQuerySchema.parse({
      days: url.searchParams.get("days") ?? 30,
      fiscalYear: url.searchParams.get("fiscalYear") ?? new Date().getUTCFullYear(),
      scenario: url.searchParams.get("scenario") ?? "base",
    });
    return successResponse(await getExecutiveFinanceSummary(input));
  } catch (error) { return handleApiError(error); }
}
