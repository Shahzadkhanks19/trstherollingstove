import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { AuthSession } from "@/models/AuthSession";
import { Role } from "@/models/Role";
import { User } from "@/models/User";
import { writeAuditLog } from "@/services/audit.service";
import { bulkUserActionSchema } from "@/validators/userManagement";

export async function PATCH(request: Request) {
  try {
    const actor = await requirePermission("users.activate");
    const input = await validateRequestBody(request, bulkUserActionSchema);
    if (input.userIds.includes(actor.id)) throw new AppError("Bulk actions cannot include your own account.", 400);
    await connectToDatabase();
    const [customerRole, superAdminRole] = await Promise.all([
      Role.findOne({ key: "customer" }).select("_id").lean(),
      Role.findOne({ key: "super_admin" }).select("_id").lean(),
    ]);
    const active = input.action === "activate";
    if (!active && superAdminRole) {
      const [selectedActiveSuperAdmins, totalActiveSuperAdmins] = await Promise.all([
        User.countDocuments({ _id: { $in: input.userIds }, roleId: superAdminRole._id, isActive: true }),
        User.countDocuments({ roleId: superAdminRole._id, isActive: true }),
      ]);
      if (selectedActiveSuperAdmins >= totalActiveSuperAdmins) throw new AppError("At least one active Super Admin account must remain.", 409);
    }
    const now = new Date();
    const result = await User.updateMany(
      { _id: { $in: input.userIds }, roleId: { $ne: customerRole?._id } },
      { $set: active ? { isActive: true, deactivatedAt: null, deactivatedBy: null, deactivationReason: "" } : { isActive: false, deactivatedAt: now, deactivatedBy: actor.id, deactivationReason: input.reason }, $inc: { tokenVersion: 1 } },
      { runValidators: true },
    );
    if (!active) await AuthSession.updateMany({ userId: { $in: input.userIds }, revokedAt: null }, { $set: { revokedAt: now, revokeReason: "Bulk deactivation." } });
    await writeAuditLog({ actorUserId: actor.id, action: active ? "staff.bulk_activated" : "staff.bulk_deactivated", entityType: "user", description: `${result.modifiedCount} staff accounts ${active ? "activated" : "deactivated"}.`, metadata: { userIds: input.userIds, reason: input.reason ?? "" } });
    return successResponse({ matched: result.matchedCount, modified: result.modifiedCount }, "Bulk action completed.");
  } catch (e) { return handleApiError(e); }
}
