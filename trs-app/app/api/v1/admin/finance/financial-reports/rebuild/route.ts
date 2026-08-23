import { requirePermission } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { buildFinancialReportSnapshot } from "@/services/financial-reports.service";
import { financialReportRebuildSchema } from "@/validators/financial-reports";

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("reports.read");
    const input = await validateRequestBody(request, financialReportRebuildSchema);
    return successResponse(await buildFinancialReportSnapshot({ days: input.days, source: input.source, generatedBy: actor.id }), "Financial reports rebuilt.");
  } catch (error) { return handleApiError(error); }
}
