import { requirePermission } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { getFinancialReportSummary } from "@/services/financial-reports.service";
import { financialReportRangeSchema } from "@/validators/financial-reports";

export async function GET(request: Request) {
  try {
    await requirePermission("reports.read");
    const url = new URL(request.url);
    const { days } = financialReportRangeSchema.parse({ days: url.searchParams.get("days") ?? 30 });
    return successResponse(await getFinancialReportSummary(days));
  } catch (error) { return handleApiError(error); }
}
