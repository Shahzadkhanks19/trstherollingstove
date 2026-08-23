import { Types } from "mongoose";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { ReportDefinition } from "@/models/ReportDefinition";
import { ReportVersion } from "@/models/ReportVersion";
import { createReportVersion, restoreReportVersion } from "@/services/report-version.service";

const restoreSchema = z.object({ version: z.number().int().min(1) });
function assertId(id: string) { if (!Types.ObjectId.isValid(id)) throw new AppError("Invalid report.", 422); }

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("reports.read");
    const { id } = await context.params; assertId(id); await connectToDatabase();
    const report = await ReportDefinition.findOne({ _id: id, $or: [{ createdBy: actor.id }, { visibility: { $in: ["team", "organization"] } }] }).select("_id version createdBy").lean();
    if (!report) throw new AppError("Report not found.", 404);
    if (String(report.createdBy) === actor.id) await createReportVersion(id, actor.id, "Current report version");
    const versions = await ReportVersion.find({ reportId: id }).sort({ version: -1 }).limit(100).lean();
    return successResponse({ versions, currentVersion: report.version }, "Report versions loaded.");
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("reports.read");
    const { id } = await context.params; assertId(id); const input = restoreSchema.parse(await request.json()); await connectToDatabase();
    await createReportVersion(id, actor.id, `Before restoring version ${input.version}`);
    const report = await restoreReportVersion(id, input.version, actor.id);
    return successResponse(report, `Version ${input.version} restored.`);
  } catch (error) { return handleApiError(error); }
}
