import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { performScheduleAction } from "@/services/report-scheduler.service";
import { scheduledReportActionSchema } from "@/validators/scheduledReport";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("reports.read"); const { id } = await context.params;
    const { action } = scheduledReportActionSchema.parse(await request.json()); await connectToDatabase();
    const result = await performScheduleAction(id, action, actor.id);
    return successResponse(result, action === "run_now" ? "Report job queued." : `Schedule ${action.replace("_", " ")} successful.`);
  } catch (error) { return handleApiError(error); }
}
