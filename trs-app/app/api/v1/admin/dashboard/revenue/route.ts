import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import {
  resolveDashboardDateRange,
} from "@/lib/dashboard/dateRange";
import {
  getRevenueSeries,
} from "@/services/dashboardAnalytics.service";
import {
  dashboardSeriesQuerySchema,
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
      dashboardSeriesQuerySchema.parse(
        Object.fromEntries(
          url.searchParams.entries(),
        ),
      );

    const range =
      resolveDashboardDateRange(
        parsed.from,
        parsed.to,
      );

    const points =
      await getRevenueSeries(
        range,
        parsed.interval,
      );

    return successResponse({
      range,
      interval: parsed.interval,
      points,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
