import { Types } from "mongoose";
import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { ReportJob } from "@/models/ReportJob";
import { cancelReportJob, retryReportJob } from "@/services/report-job-runner.service";
import { reportJobActionSchema } from "@/validators/reportJobs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("reports.read");
    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) throw new AppError("Invalid report job.", 422);
    await connectToDatabase();
    const job = await ReportJob.findById(id).populate("reportId", "name dataset").populate("scheduleId", "name").populate("requestedBy", "name email").lean();
    if (!job) throw new AppError("Report job not found.", 404);
    return successResponse(job);
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("reports.read");
    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) throw new AppError("Invalid report job.", 422);
    const input = await validateRequestBody(request, reportJobActionSchema);
    await connectToDatabase();
    const job = input.action === "retry" ? await retryReportJob(id, actor.id) : await cancelReportJob(id);
    return successResponse(job, input.action === "retry" ? "Report job queued for retry." : "Report job cancelled.");
  } catch (error) { return handleApiError(error); }
}
