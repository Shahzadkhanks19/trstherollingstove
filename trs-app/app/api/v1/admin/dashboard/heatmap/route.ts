import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import {
  resolveDashboardDateRange,
} from "@/lib/dashboard/dateRange";
import {
  getHourlyHeatmap,
} from "@/services/dashboardAnalytics.service";
import {
  dashboardAnalyticsQuerySchema,
} from "@/validators/dashboardAnalytics";

export async function GET(
  request: Request,
) {
  try {
    await requirePermission(
      "reports.read",
    );
    await connectToDatabase();

    const url = new URL(request.url);
    const parsed =
      dashboardAnalyticsQuerySchema.parse(
        Object.fromEntries(
          url.searchParams.entries(),
        ),
      );

    const range =
      resolveDashboardDateRange(
        parsed.from,
        parsed.to,
      );

    const items =
      await getHourlyHeatmap(
        range,
      );

    return successResponse({
      range,
      timezone: "Asia/Kolkata",
      items,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
