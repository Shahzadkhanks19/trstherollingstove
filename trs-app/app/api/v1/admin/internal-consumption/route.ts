import { Types } from "mongoose";
import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { InternalConsumptionAudit } from "@/models/InternalConsumptionAudit";
import { InternalConsumptionMember } from "@/models/InternalConsumptionMember";
import { InternalConsumptionReason } from "@/models/InternalConsumptionReason";
import { Order } from "@/models/Order";
import { Role } from "@/models/Role";
import { StaffProfile } from "@/models/StaffProfile";
import { User } from "@/models/User";
import { familyMemberSchema, internalReasonSchema, staffMealSettingsSchema } from "@/validators/internalConsumption";

const defaultReasons = [
  ["staff_meal", "Lunch"], ["staff_meal", "Dinner"], ["staff_meal", "Overtime"],
  ["family_meal", "Family visit"], ["family_meal", "Lunch"], ["family_meal", "Dinner"],
  ["complimentary", "VIP guest"], ["complimentary", "Customer complaint"], ["complimentary", "Marketing / influencer"],
  ["food_wastage", "Burnt"], ["food_wastage", "Wrong preparation"], ["food_wastage", "Spoiled / expired"],
  ["kitchen_test", "New recipe"], ["kitchen_test", "Recipe improvement"], ["kitchen_test", "Staff training"],
] as const;

async function audit(actor: { id: string }, action: string, subjectId: Types.ObjectId | string | null | undefined, subjectName: string, metadata: Record<string, unknown> = {}) {
  await InternalConsumptionAudit.create({ action, actorId: actor.id, subjectId, subjectName, metadata });
}

async function ensureDefaultReasons(actorId: string) {
  if (await InternalConsumptionReason.exists({ deletedAt: null })) return;
  await InternalConsumptionReason.insertMany(defaultReasons.map(([saleType, name], sortOrder) => ({ saleType, name, sortOrder, createdBy: actorId, updatedBy: actorId })), { ordered: false });
}

export async function GET(request: Request) {
  try {
    const actor = await requirePermission("settings.manage");
    await connectToDatabase();
    await ensureDefaultReasons(actor.id);
    const params = new URL(request.url).searchParams;
    const includeDeleted = params.get("includeDeleted") === "true";
    const search = params.get("search")?.trim() ?? "";
    const searchFilter = search ? { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } : undefined;
    const customerRole = await Role.findOne({ key: "customer" }).select("_id").lean();
    const [users, family, reasons, summary, approvals, audits] = await Promise.all([
      User.find({ ...(includeDeleted ? {} : { isActive: true }), ...(customerRole?._id ? { roleId: { $ne: customerRole._id } } : {}), ...(searchFilter ? { $or: [{ name: searchFilter }, { email: searchFilter }] } : {}) })
        .select("name email phone avatarUrl isActive deactivatedAt").sort({ name: 1 }).lean(),
      InternalConsumptionMember.find({ type: "family", ...(includeDeleted ? {} : { deletedAt: null }), ...(searchFilter ? { $or: [{ name: searchFilter }, { relationship: searchFilter }, { phone: searchFilter }] } : {}) }).sort({ isActive: -1, name: 1 }).lean(),
      InternalConsumptionReason.find({ ...(includeDeleted ? {} : { deletedAt: null }), ...(searchFilter ? { name: searchFilter } : {}) }).sort({ saleType: 1, sortOrder: 1, name: 1 }).lean(),
      Order.aggregate([{ $match: { saleType: { $ne: "customer" }, createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }, { $group: { _id: "$saleType", orders: { $sum: 1 }, menuValue: { $sum: "$subtotal" } } }]),
      Order.find({ saleType: "staff_meal", "internalConsumption.approvalStatus": "approved" }).select("orderNumber internalConsumption subtotal createdAt createdBy").sort({ createdAt: -1 }).limit(100).lean(),
      InternalConsumptionAudit.find({ action: { $regex: /^(family|reason|staff)_/ } }).sort({ createdAt: -1 }).limit(150).lean(),
    ]);
    const profiles = await StaffProfile.find({ userId: { $in: users.map((user) => user._id) } }).lean();
    const byUser = new Map(profiles.map((profile) => [String(profile.userId), profile]));
    return successResponse({
      staff: users.map((user) => ({ id: String(user._id), name: user.name, email: user.email, phone: user.phone, avatarUrl: user.avatarUrl, isActive: user.isActive, profile: byUser.get(String(user._id)) ?? null })),
      family, reasons, summary, approvals, audits,
    }, "Internal consumption management loaded.");
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("settings.manage");
    const payload = await request.json() as { action?: string; data?: unknown };
    await connectToDatabase();
    if (payload.action === "family.create") {
      const input = familyMemberSchema.parse(payload.data);
      if (await InternalConsumptionMember.exists({ type: "family", name: input.name, deletedAt: null })) throw new AppError("A family member with this name already exists.", 409);
      const member = await InternalConsumptionMember.create({ ...input, type: "family", createdBy: actor.id, updatedBy: actor.id });
      await audit(actor, "family_created", member._id, member.name, { after: member.toObject() });
      return successResponse(member, "Family member created.", 201);
    }
    if (payload.action === "reason.create") {
      const input = internalReasonSchema.parse(payload.data);
      if (await InternalConsumptionReason.exists({ saleType: input.saleType, name: input.name, deletedAt: null })) throw new AppError("This reason already exists for the selected order type.", 409);
      const reason = await InternalConsumptionReason.create({ ...input, createdBy: actor.id, updatedBy: actor.id });
      await audit(actor, "reason_created", reason._id, reason.name, { saleType: reason.saleType, after: reason.toObject() });
      return successResponse(reason, "Reason created.", 201);
    }
    if (payload.action === "staff.settings") {
      const input = staffMealSettingsSchema.parse(payload.data);
      if (!Types.ObjectId.isValid(input.userId)) throw new AppError("Invalid staff member.", 422);
      const before = await StaffProfile.findOne({ userId: input.userId }).lean();
      const profile = await StaffProfile.findOneAndUpdate({ userId: input.userId }, { $set: {
        mealEligible: input.mealEligible, dailyMealLimit: input.dailyMealLimit, weeklyMealLimit: input.weeklyMealLimit,
        monthlyMealLimit: input.monthlyMealLimit, yearlyMealLimit: input.yearlyMealLimit, unlimitedMeals: input.unlimitedMeals,
        mealSuspendedUntil: input.mealSuspendedUntil ? new Date(input.mealSuspendedUntil) : null,
        mealSuspensionReason: input.mealSuspensionReason, requireManagerApprovalOnLimit: input.requireManagerApprovalOnLimit,
      } }, { new: true }).lean();
      if (!profile) throw new AppError("Staff profile not found.", 404);
      await audit(actor, "staff_meal_settings_updated", profile._id, String(input.userId), { before, after: profile });
      return successResponse(profile, "Staff meal settings updated.");
    }
    throw new AppError("Unsupported internal consumption action.", 422);
  } catch (error) { return handleApiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requirePermission("settings.manage");
    const payload = await request.json() as { entity?: "family" | "reason"; id?: string; data?: Record<string, unknown> };
    if (!payload.id || !Types.ObjectId.isValid(payload.id)) throw new AppError("Invalid record.", 422);
    await connectToDatabase();
    if (payload.entity === "family") {
      const input = familyMemberSchema.partial().parse(payload.data);
      const before = await InternalConsumptionMember.findById(payload.id).lean();
      const updated = await InternalConsumptionMember.findOneAndUpdate({ _id: payload.id, deletedAt: null }, { $set: { ...input, updatedBy: actor.id } }, { new: true }).lean();
      if (!updated) throw new AppError("Family member not found.", 404);
      await audit(actor, "family_updated", updated._id, updated.name, { before, after: updated });
      return successResponse(updated, "Family member updated.");
    }
    if (payload.entity === "reason") {
      const input = internalReasonSchema.partial().parse(payload.data);
      const before = await InternalConsumptionReason.findById(payload.id).lean();
      const updated = await InternalConsumptionReason.findOneAndUpdate({ _id: payload.id, deletedAt: null }, { $set: { ...input, updatedBy: actor.id } }, { new: true }).lean();
      if (!updated) throw new AppError("Reason not found.", 404);
      await audit(actor, "reason_updated", updated._id, updated.name, { before, after: updated });
      return successResponse(updated, "Reason updated.");
    }
    throw new AppError("Unsupported record type.", 422);
  } catch (error) { return handleApiError(error); }
}

export async function DELETE(request: Request) {
  try {
    const actor = await requirePermission("settings.manage");
    const { searchParams } = new URL(request.url);
    const entity = searchParams.get("entity");
    const id = searchParams.get("id");
    const restore = searchParams.get("restore") === "true";
    if (!id || !Types.ObjectId.isValid(id)) throw new AppError("Invalid record.", 422);
    await connectToDatabase();
    const update = restore ? { isActive: true, deletedAt: null, updatedBy: actor.id } : { isActive: false, deletedAt: new Date(), updatedBy: actor.id };
    if (entity === "family") {
      const record = await InternalConsumptionMember.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
      if (!record) throw new AppError("Family member not found.", 404);
      await audit(actor, `family_${restore ? "restored" : "archived"}`, record._id, record.name);
      return successResponse(record, restore ? "Family member restored." : "Family member archived.");
    }
    if (entity === "reason") {
      const record = await InternalConsumptionReason.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
      if (!record) throw new AppError("Reason not found.", 404);
      await audit(actor, `reason_${restore ? "restored" : "archived"}`, record._id, record.name);
      return successResponse(record, restore ? "Reason restored." : "Reason archived.");
    }
    throw new AppError("Unsupported record type.", 422);
  } catch (error) { return handleApiError(error); }
}
