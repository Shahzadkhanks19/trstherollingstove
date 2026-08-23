import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { cleanupExpiredReportArtifacts } from "@/services/report-automation.service";

export async function POST(request: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) throw new AppError("Unauthorized cron request.", 401);
    await connectToDatabase();
    return successResponse(await cleanupExpiredReportArtifacts(), "Report artifact cleanup completed.");
  } catch (error) { return handleApiError(error); }
}
