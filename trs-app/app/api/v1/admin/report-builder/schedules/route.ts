import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { ReportDefinition } from "@/models/ReportDefinition";
import { ScheduledReport } from "@/models/ScheduledReport";
import { createScheduledReport } from "@/services/report-scheduler.service";
import { scheduledReportCreateSchema } from "@/validators/scheduledReport";

export async function GET(request: Request) {
  try {
    const actor = await requirePermission("reports.read"); await connectToDatabase();
    const params = new URL(request.url).searchParams;
    const includeArchived = params.get("includeArchived") === "true";
    const filter: Record<string, unknown> = { createdBy: actor.id, ...(includeArchived ? {} : { deletedAt: null }) };
    const [schedules, reports] = await Promise.all([
      ScheduledReport.find(filter).populate("reportId", "name dataset").populate("lastJobId", "status createdAt").sort({ deletedAt: 1, status: 1, nextRunAt: 1, updatedAt: -1 }).lean(),
      ReportDefinition.find({ isArchived: false, $or: [{ createdBy: actor.id }, { visibility: { $in: ["team", "organization"] } }] }).select("name dataset").sort({ name: 1 }).lean(),
    ]);
    return successResponse({ schedules, reports });
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("reports.read");
    const input = scheduledReportCreateSchema.parse(await request.json()); await connectToDatabase();
    const schedule = await createScheduledReport(input, actor.id);
    return successResponse(schedule, "Scheduled report created.", 201);
  } catch (error) { return handleApiError(error); }
}
