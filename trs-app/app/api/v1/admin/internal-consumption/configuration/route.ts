import { Types } from "mongoose";
import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { InternalConsumptionAudit } from "@/models/InternalConsumptionAudit";
import { InternalConsumptionMaster } from "@/models/InternalConsumptionMaster";
import { InternalConsumptionPolicy } from "@/models/InternalConsumptionPolicy";
import { InternalConsumptionSettings } from "@/models/InternalConsumptionSettings";
import { internalMasterSchema, internalPolicySchema, internalSettingsSchema } from "@/validators/internalConsumption";

async function audit(actor: { id: string }, action: string, subjectId: Types.ObjectId | string | null | undefined, subjectName: string, metadata: Record<string, unknown> = {}) {
  await InternalConsumptionAudit.create({ action, actorId: actor.id, actorName: "", subjectId, subjectName, metadata });
}

export async function GET(request: Request) {
  try {
    const actor = await requirePermission("settings.manage");
    await connectToDatabase();
    const includeDeleted = new URL(request.url).searchParams.get("includeDeleted") === "true";
    const [masters, policies, settings, audits] = await Promise.all([
      InternalConsumptionMaster.find(includeDeleted ? {} : { deletedAt: null }).sort({ type: 1, sortOrder: 1, name: 1 }).lean(),
      InternalConsumptionPolicy.find(includeDeleted ? {} : { deletedAt: null }).sort({ priority: 1, name: 1 }).lean(),
      InternalConsumptionSettings.findOneAndUpdate(
        { key: "default" },
        { $setOnInsert: { key: "default", updatedBy: actor.id } },
        { new: true, upsert: true },
      ).lean(),
      InternalConsumptionAudit.find({ action: { $regex: /^(master|policy|settings)_/ } }).sort({ createdAt: -1 }).limit(100).lean(),
    ]);
    return successResponse({ masters, policies, settings, audits }, "Internal consumption configuration loaded.");
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("settings.manage");
    const payload = await request.json() as { action?: string; data?: unknown };
    await connectToDatabase();
    if (payload.action === "master.create") {
      const input = internalMasterSchema.parse(payload.data);
      if (await InternalConsumptionMaster.exists({ type: input.type, name: input.name, deletedAt: null })) throw new AppError("A record with this name already exists.", 409);
      const record = await InternalConsumptionMaster.create({ ...input, createdBy: actor.id, updatedBy: actor.id });
      await audit(actor, "master_created", record._id, record.name, { type: record.type });
      return successResponse(record, "Master record created.", 201);
    }
    if (payload.action === "policy.create") {
      const input = internalPolicySchema.parse(payload.data);
      if (input.scopeType !== "global" && (!input.scopeId || !Types.ObjectId.isValid(input.scopeId))) throw new AppError("A valid scope is required.", 422);
      const record = await InternalConsumptionPolicy.create({ ...input, scopeId: input.scopeType === "global" ? null : input.scopeId, createdBy: actor.id, updatedBy: actor.id });
      await audit(actor, "policy_created", record._id, record.name, { scopeType: record.scopeType });
      return successResponse(record, "Meal policy created.", 201);
    }
    throw new AppError("Unsupported configuration action.", 422);
  } catch (error) { return handleApiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requirePermission("settings.manage");
    const payload = await request.json() as { entity?: "master" | "policy" | "settings"; id?: string; data?: unknown };
    await connectToDatabase();
    if (payload.entity === "settings") {
      const input = internalSettingsSchema.parse(payload.data);
      const before = await InternalConsumptionSettings.findOne({ key: "default" }).lean();
      const record = await InternalConsumptionSettings.findOneAndUpdate({ key: "default" }, { $set: { ...input, updatedBy: actor.id } }, { new: true, upsert: true }).lean();
      await audit(actor, "settings_updated", record?._id, "Internal consumption settings", { before, after: record });
      return successResponse(record, "Settings updated.");
    }
    if (!payload.id || !Types.ObjectId.isValid(payload.id)) throw new AppError("Invalid record.", 422);
    if (payload.entity === "master") {
      const input = internalMasterSchema.partial().parse(payload.data);
      const before = await InternalConsumptionMaster.findById(payload.id).lean();
      const record = await InternalConsumptionMaster.findOneAndUpdate({ _id: payload.id, deletedAt: null }, { $set: { ...input, updatedBy: actor.id } }, { new: true }).lean();
      if (!record) throw new AppError("Master record not found.", 404);
      await audit(actor, "master_updated", record._id, record.name, { before, after: record });
      return successResponse(record, "Master record updated.");
    }
    if (payload.entity === "policy") {
      const input = internalPolicySchema.partial().parse(payload.data);
      const before = await InternalConsumptionPolicy.findById(payload.id).lean();
      const record = await InternalConsumptionPolicy.findOneAndUpdate({ _id: payload.id, deletedAt: null }, { $set: { ...input, updatedBy: actor.id } }, { new: true }).lean();
      if (!record) throw new AppError("Meal policy not found.", 404);
      await audit(actor, "policy_updated", record._id, record.name, { before, after: record });
      return successResponse(record, "Meal policy updated.");
    }
    throw new AppError("Unsupported configuration entity.", 422);
  } catch (error) { return handleApiError(error); }
}

export async function DELETE(request: Request) {
  try {
    const actor = await requirePermission("settings.manage");
    const params = new URL(request.url).searchParams;
    const entity = params.get("entity");
    const id = params.get("id");
    const restore = params.get("restore") === "true";
    if (!id || !Types.ObjectId.isValid(id)) throw new AppError("Invalid record.", 422);
    await connectToDatabase();
    const update = { $set: restore ? { deletedAt: null, isActive: true, updatedBy: actor.id } : { deletedAt: new Date(), isActive: false, updatedBy: actor.id } };
    if (entity === "master") {
      const record = await InternalConsumptionMaster.findByIdAndUpdate(id, update, { new: true }).lean();
      if (!record) throw new AppError("Record not found.", 404);
      await audit(actor, `master_${restore ? "restored" : "deleted"}`, record._id, record.name);
      return successResponse(record, restore ? "Record restored." : "Record archived.");
    }
    if (entity === "policy") {
      const record = await InternalConsumptionPolicy.findByIdAndUpdate(id, update, { new: true }).lean();
      if (!record) throw new AppError("Record not found.", 404);
      await audit(actor, `policy_${restore ? "restored" : "deleted"}`, record._id, record.name);
      return successResponse(record, restore ? "Record restored." : "Record archived.");
    }
    throw new AppError("Unsupported configuration entity.", 422);
  } catch (error) { return handleApiError(error); }
}
