import { Types } from "mongoose";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { ReportDefinition } from "@/models/ReportDefinition";
import { ReportVersion } from "@/models/ReportVersion";
import { ReportAudit } from "@/models/ReportAudit";
import { createReportVersion, reportSnapshot } from "@/services/report-version.service";
import { reportDefinitionSchema } from "@/validators/reportBuilder";

function assertId(id: string) { if (!Types.ObjectId.isValid(id)) throw new AppError("Invalid report.", 422); }
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("duplicate") }),
  z.object({ action: z.literal("favorite"), value: z.boolean() }),
  z.object({ action: z.literal("pin"), value: z.boolean() }),
]);

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("reports.read");
    const { id } = await context.params; assertId(id); await connectToDatabase();
    const report = await ReportDefinition.findOne({ _id: id, $or: [{ createdBy: actor.id }, { visibility: { $in: ["team", "organization"] } }] }).lean();
    if (!report) throw new AppError("Report not found.", 404);
    return successResponse(report, "Report loaded.");
  } catch (error) { return handleApiError(error); }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("reports.read");
    const { id } = await context.params; assertId(id);
    const input = reportDefinitionSchema.partial().parse(await request.json()); await connectToDatabase();
    const current = await ReportDefinition.findOne({ _id: id, createdBy: actor.id }).lean();
    if (!current) throw new AppError("Only the report owner can edit this report.", 403);
    await ReportVersion.updateOne(
      { reportId: current._id, version: current.version },
      { $setOnInsert: { snapshot: reportSnapshot(current as unknown as Record<string, unknown>), changeSummary: "Report updated", createdBy: actor.id } },
      { upsert: true },
    );
    const report = await ReportDefinition.findByIdAndUpdate(id, { $set: { ...input, updatedBy: actor.id }, $inc: { version: 1 } }, { new: true }).lean();
    await ReportAudit.create({ reportId: id, action: "updated", actorId: actor.id, metadata: { fields: Object.keys(input) } });
    return successResponse(report, "Report updated.");
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("reports.read");
    const { id } = await context.params; assertId(id); const payload = actionSchema.parse(await request.json()); await connectToDatabase();
    if (payload.action === "favorite" || payload.action === "pin") {
      const field = payload.action === "favorite" ? "isFavorite" : "isPinned";
      const report = await ReportDefinition.findOneAndUpdate({ _id: id, createdBy: actor.id }, { $set: { [field]: payload.value, updatedBy: actor.id } }, { new: true }).lean();
      if (!report) throw new AppError("Only the report owner can update this setting.", 403);
      await ReportAudit.create({ reportId: id, action: payload.action === "favorite" ? (payload.value ? "favorited" : "unfavorited") : (payload.value ? "pinned" : "unpinned"), actorId: actor.id });
      return successResponse(report, payload.action === "favorite" ? (payload.value ? "Report added to favorites." : "Report removed from favorites.") : (payload.value ? "Report pinned to dashboard." : "Report removed from dashboard."));
    }
    const source = await ReportDefinition.findOne({ _id: id, $or: [{ createdBy: actor.id }, { visibility: { $in: ["team", "organization"] } }] }).lean();
    if (!source) throw new AppError("Report not found.", 404);
    const copy = { ...source };
    Reflect.deleteProperty(copy, "_id");
    Reflect.deleteProperty(copy, "createdAt");
    Reflect.deleteProperty(copy, "updatedAt");
    const report = await ReportDefinition.create({ ...copy, name: `${source.name} Copy`, visibility: "private", isFavorite: false, isArchived: false, version: 1, lastRunAt: null, createdBy: actor.id, updatedBy: actor.id });
    await Promise.all([createReportVersion(String(report._id), actor.id, "Initial duplicated version"), ReportAudit.create({ reportId: report._id, action: "duplicated", actorId: actor.id, metadata: { sourceReportId: id } })]);
    return successResponse(report, "Report duplicated.", 201);
  } catch (error) { return handleApiError(error); }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("reports.read");
    const { id } = await context.params; assertId(id); const restore = new URL(request.url).searchParams.get("restore") === "true"; await connectToDatabase();
    const report = await ReportDefinition.findOneAndUpdate({ _id: id, createdBy: actor.id }, { $set: { isArchived: !restore, updatedBy: actor.id } }, { new: true }).lean();
    if (!report) throw new AppError("Only the report owner can archive or restore this report.", 403);
    await ReportAudit.create({ reportId: id, action: restore ? "restored" : "archived", actorId: actor.id });
    return successResponse(report, restore ? "Report restored." : "Report archived.");
  } catch (error) { return handleApiError(error); }
}
