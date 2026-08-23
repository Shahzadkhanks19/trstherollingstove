import { requirePermission } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { buildRevenueSnapshot } from "@/services/revenue-management.service";
import { revenueRebuildSchema } from "@/validators/revenue-management";

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("reports.read");
    const input = await validateRequestBody(request, revenueRebuildSchema);
    const snapshot = await buildRevenueSnapshot({ ...input, generatedBy: actor.id });
    return successResponse(snapshot, "Revenue snapshot rebuilt.");
  } catch (error) {
    return handleApiError(error);
  }
}
