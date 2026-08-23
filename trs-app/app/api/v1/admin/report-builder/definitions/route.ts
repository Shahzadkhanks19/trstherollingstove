import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { ReportDefinition } from "@/models/ReportDefinition";
import { ReportVersion } from "@/models/ReportVersion";
import { ReportAudit } from "@/models/ReportAudit";
import { reportSnapshot } from "@/services/report-version.service";
import { getRegistryPayload } from "@/services/report-builder-registry";
import { reportDefinitionSchema } from "@/validators/reportBuilder";

export async function GET(request: Request) {
  try {
    const actor = await requirePermission("reports.read"); await connectToDatabase();
    const params = new URL(request.url).searchParams;
    const search = params.get("search")?.trim() ?? "";
    const includeArchived = params.get("includeArchived") === "true";
    const favoriteOnly = params.get("favorite") === "true";
    const visibility = params.get("visibility");
    const filter: Record<string, unknown> = {
      ...(includeArchived ? {} : { isArchived: false }),
      ...(favoriteOnly ? { isFavorite: true, createdBy: actor.id } : {}),
      ...(!favoriteOnly ? { $or: [{ createdBy: actor.id }, { visibility: { $in: ["team", "organization"] } }] } : {}),
      ...(visibility && ["private", "team", "organization"].includes(visibility) ? { visibility } : {}),
    };
    if (search) filter.$and = [{ $or: [{ name: { $regex: search, $options: "i" } }, { description: { $regex: search, $options: "i" } }, { tags: { $regex: search, $options: "i" } }] }];
    const reports = await ReportDefinition.find(filter).sort({ isFavorite: -1, updatedAt: -1 }).limit(200).lean();
    return successResponse({ reports, datasets: getRegistryPayload() }, "Report builder loaded.");
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("reports.read");
    const input = reportDefinitionSchema.parse(await request.json()); await connectToDatabase();
    const report = await ReportDefinition.create({ ...input, createdBy: actor.id, updatedBy: actor.id });
    await Promise.all([
      ReportVersion.create({ reportId: report._id, version: 1, snapshot: reportSnapshot(report.toObject() as Record<string, unknown>), changeSummary: "Initial report version", createdBy: actor.id }),
      ReportAudit.create({ reportId: report._id, action: "created", actorId: actor.id, metadata: { dataset: report.dataset } }),
    ]);
    return successResponse(report, "Report created.", 201);
  } catch (error) { return handleApiError(error); }
}
