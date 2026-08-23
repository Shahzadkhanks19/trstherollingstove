import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { ReportJob } from "@/models/ReportJob";
import { enqueueDueScheduledReports, getReportJobQueueSummary, runReportJobWorker } from "@/services/report-job-runner.service";
import { reportJobQuerySchema, reportWorkerRunSchema } from "@/validators/reportJobs";

export async function GET(request: Request) {
  try {
    await requirePermission("reports.read");
    await connectToDatabase();
    const parsed = reportJobQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    const filter: Record<string, unknown> = {};
    if (parsed.status) filter.status = parsed.status;
    if (parsed.source) filter.source = parsed.source;
    if (parsed.search) {
      const regex = { $regex: parsed.search, $options: "i" };
      filter.$or = [{ outputFilename: regex }, { errorMessage: regex }, { deduplicationKey: regex }];
    }
    const skip = (parsed.page - 1) * parsed.limit;
    const [jobs, total, summary] = await Promise.all([
      ReportJob.find(filter)
        .populate("reportId", "name dataset")
        .populate("scheduleId", "name")
        .populate("requestedBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsed.limit)
        .lean(),
      ReportJob.countDocuments(filter),
      getReportJobQueueSummary(),
    ]);
    return successResponse({ jobs, summary, pagination: { page: parsed.page, limit: parsed.limit, total, pages: Math.max(1, Math.ceil(total / parsed.limit)) } });
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: Request) {
  try {
    await requirePermission("reports.read");
    const input = await validateRequestBody(request, reportWorkerRunSchema);
    await connectToDatabase();
    const scheduled = await enqueueDueScheduledReports();
    const worker = await runReportJobWorker(input.limit);
    return successResponse({ scheduled, worker }, "Report worker completed.");
  } catch (error) { return handleApiError(error); }
}
