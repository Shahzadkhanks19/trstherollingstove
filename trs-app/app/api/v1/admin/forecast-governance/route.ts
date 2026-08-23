import { requirePermission } from "@/lib/auth/session";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { getForecastGovernanceDashboard, performForecastGovernanceAction } from "@/services/forecast-governance.service";
import { forecastGovernanceActionSchema, forecastGovernanceQuerySchema } from "@/validators/forecastGovernance";

export async function GET(request: Request) {
  try {
    await requirePermission("reports.read");
    const parsed = forecastGovernanceQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message ?? "Invalid governance query.", 400);
    return successResponse(await getForecastGovernanceDashboard(parsed.data.limit), "Forecast governance loaded.");
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("reports.read");
    const parsed = forecastGovernanceActionSchema.safeParse(await request.json());
    if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message ?? "Invalid governance action.", 400);
    const result = await performForecastGovernanceAction({ ...parsed.data, actorId: actor.id });
    return successResponse(result, result.message);
  } catch (error) { return handleApiError(error); }
}
