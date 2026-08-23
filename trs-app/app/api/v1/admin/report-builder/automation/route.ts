import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { cleanupExpiredReportArtifacts, getReportAutomationMonitor, updateReportAutomationSettings } from "@/services/report-automation.service";
import { reportAutomationSettingsSchema } from "@/validators/reportAutomation";

export async function GET() {
  try {
    await requirePermission("reports.read");
    await connectToDatabase();
    return successResponse(await getReportAutomationMonitor());
  } catch (error) { return handleApiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requirePermission("settings.manage");
    const input = await validateRequestBody(request, reportAutomationSettingsSchema);
    await connectToDatabase();
    const settings = await updateReportAutomationSettings(input, actor.id);
    return successResponse(settings, "Report automation settings updated.");
  } catch (error) { return handleApiError(error); }
}

export async function POST() {
  try {
    await requirePermission("settings.manage");
    await connectToDatabase();
    return successResponse(await cleanupExpiredReportArtifacts(), "Expired report artifacts cleaned up.");
  } catch (error) { return handleApiError(error); }
}
