import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { ReportJob } from "@/models/ReportJob";
import { ReportScheduleAudit } from "@/models/ReportScheduleAudit";
import { ScheduledReport } from "@/models/ScheduledReport";
import { updateScheduledReport } from "@/services/report-scheduler.service";
import { scheduledReportUpdateSchema } from "@/validators/scheduledReport";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("reports.read"); const { id } = await context.params; await connectToDatabase();
    const schedule = await ScheduledReport.findOne({ _id: id, createdBy: actor.id }).populate("reportId", "name dataset").lean();
    if (!schedule) throw new AppError("Scheduled report not found.", 404);
    const [jobs, audits] = await Promise.all([
      ReportJob.find({ scheduleId: id }).sort({ createdAt: -1 }).limit(50).lean(),
      ReportScheduleAudit.find({ scheduleId: id }).populate("actorId", "name email").sort({ createdAt: -1 }).limit(50).lean(),
    ]);
    return successResponse({ schedule, jobs, audits });
  } catch (error) { return handleApiError(error); }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("reports.read"); const { id } = await context.params;
    const input = scheduledReportUpdateSchema.parse(await request.json()); await connectToDatabase();
    const schedule = await updateScheduledReport(id, input, actor.id);
    return successResponse(schedule, "Scheduled report updated.");
  } catch (error) { return handleApiError(error); }
}
