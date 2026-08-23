import { Types } from "mongoose";
import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { InternalConsumptionAudit } from "@/models/InternalConsumptionAudit";
import { InternalConsumptionDirectory } from "@/models/InternalConsumptionDirectory";
import { internalDirectorySchema, internalDirectoryTypeSchema } from "@/validators/internalConsumption";

export async function GET(request: Request) {
  try {
    await requirePermission("settings.manage");
    await connectToDatabase();
    const params = new URL(request.url).searchParams;
    const type = params.get("type");
    const includeDeleted = params.get("includeDeleted") === "true";
    const filter: Record<string, unknown> = includeDeleted ? {} : { deletedAt: null };
    if (type) filter.type = internalDirectoryTypeSchema.parse(type);
    const records = await InternalConsumptionDirectory.find(filter).sort({ type: 1, sortOrder: 1, name: 1 }).lean();
    return successResponse(records, "Directory records loaded.");
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("settings.manage");
    const input = internalDirectorySchema.parse(await request.json());
    await connectToDatabase();
    if (await InternalConsumptionDirectory.exists({ type: input.type, name: input.name, deletedAt: null })) throw new AppError("A matching record already exists.", 409);
    const record = await InternalConsumptionDirectory.create({ ...input, createdBy: actor.id, updatedBy: actor.id });
    await InternalConsumptionAudit.create({ action: "directory_created", actorId: actor.id, actorName: "", subjectId: record._id, subjectName: record.name, metadata: { type: record.type } });
    return successResponse(record, "Directory record created.", 201);
  } catch (error) { return handleApiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requirePermission("settings.manage");
    const payload = await request.json() as { id?: string; data?: unknown };
    if (!payload.id || !Types.ObjectId.isValid(payload.id)) throw new AppError("Invalid record.", 422);
    const input = internalDirectorySchema.partial().parse(payload.data);
    await connectToDatabase();
    const before = await InternalConsumptionDirectory.findById(payload.id).lean();
    const record = await InternalConsumptionDirectory.findOneAndUpdate({ _id: payload.id, deletedAt: null }, { $set: { ...input, updatedBy: actor.id } }, { new: true }).lean();
    if (!record) throw new AppError("Directory record not found.", 404);
    await InternalConsumptionAudit.create({ action: "directory_updated", actorId: actor.id, actorName: "", subjectId: record._id, subjectName: record.name, metadata: { before, after: record } });
    return successResponse(record, "Directory record updated.");
  } catch (error) { return handleApiError(error); }
}

export async function DELETE(request: Request) {
  try {
    const actor = await requirePermission("settings.manage");
    const params = new URL(request.url).searchParams;
    const id = params.get("id");
    const restore = params.get("restore") === "true";
    if (!id || !Types.ObjectId.isValid(id)) throw new AppError("Invalid record.", 422);
    await connectToDatabase();
    const record = await InternalConsumptionDirectory.findByIdAndUpdate(id, { $set: restore ? { deletedAt: null, isActive: true, updatedBy: actor.id } : { deletedAt: new Date(), isActive: false, updatedBy: actor.id } }, { new: true }).lean();
    if (!record) throw new AppError("Directory record not found.", 404);
    await InternalConsumptionAudit.create({ action: restore ? "directory_restored" : "directory_archived", actorId: actor.id, actorName: "", subjectId: record._id, subjectName: record.name, metadata: { type: record.type } });
    return successResponse(record, restore ? "Record restored." : "Record archived.");
  } catch (error) { return handleApiError(error); }
}
