import { requirePermission } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { buildExecutiveFinanceSnapshot } from "@/services/executive-finance.service";
import { executiveFinanceRebuildSchema } from "@/validators/executive-finance";

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("reports.read");
    const input = await validateRequestBody(request, executiveFinanceRebuildSchema);
    return successResponse(await buildExecutiveFinanceSnapshot({
      days: input.days,
      fiscalYear: input.fiscalYear,
      scenario: input.scenario,
      source: input.source,
      generatedBy: actor.id,
    }), "Executive finance dashboard rebuilt.");
  } catch (error) { return handleApiError(error); }
}
