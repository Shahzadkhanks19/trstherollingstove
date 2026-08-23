import { requirePermission } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { getRevenueSummary } from "@/services/revenue-management.service";
import { revenueRangeSchema } from "@/validators/revenue-management";

export async function GET(request: Request) {
  try {
    await requirePermission("reports.read");
    const url = new URL(request.url);
    const { days } = revenueRangeSchema.parse({ days: url.searchParams.get("days") ?? 30 });
    return successResponse(await getRevenueSummary(days), "Revenue summary loaded.");
  } catch (error) {
    return handleApiError(error);
  }
}
