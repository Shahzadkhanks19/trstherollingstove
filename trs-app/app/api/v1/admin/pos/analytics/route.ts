import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { getPosAnalytics } from "@/services/pos-analytics.service";
import { posAnalyticsQuerySchema } from "@/validators/posAnalytics";

export async function GET(request: Request) {
  try {
    await requirePermission("reports.read");
    const url = new URL(request.url);
    const parsed = posAnalyticsQuerySchema.parse(Object.fromEntries(url.searchParams));
    await connectToDatabase();
    return successResponse(await getPosAnalytics(parsed));
  } catch (error) { return handleApiError(error); }
}
