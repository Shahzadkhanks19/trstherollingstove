import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { getForecastSummary } from "@/services/inventory-forecast.service";

export async function GET(request: Request) {
  try {
    await requirePermission("inventory.read");
    const url = new URL(request.url);
    const runId = url.searchParams.get("runId") ?? undefined;

    await connectToDatabase();

    return successResponse(
      await getForecastSummary(runId),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
