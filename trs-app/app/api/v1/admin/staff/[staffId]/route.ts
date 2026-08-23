import { requirePermission } from "@/lib/auth/session";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { Role } from "@/models/Role";
import { StaffProfile } from "@/models/StaffProfile";
import { User } from "@/models/User";
import { writeAuditLog } from "@/services/audit.service";
import {
  applyActivationState,
  assertCanRemoveSuperAdminAccess,
  assertStaffRole,
  revokeUserSessions,
  serializeStaff,
} from "@/services/userManagement.service";
import { staffUpdateSchema } from "@/validators/userManagement";
async function staff(id: string) {
  const user = await User.findById(id);
  const role = user && (await Role.findById(user.roleId).lean());
  if (!user || role?.key === "customer")
    throw new AppError("Staff member not found.", 404);
  return user;
}
export async function GET(
  _: Request,
  c: { params: Promise<{ staffId: string }> },
) {
  try {
    await requirePermission("users.read");
    await connectToDatabase();
    const { staffId } = await c.params;
    await staff(staffId);
    return successResponse(await serializeStaff(staffId), "Staff loaded.");
  } catch (e) {
    return handleApiError(e);
  }
}
export async function PATCH(
  request: Request,
  c: { params: Promise<{ staffId: string }> },
) {
  try {
    const actor = await requirePermission("users.update");
    const { staffId } = await c.params;
    const input = await validateRequestBody(request, staffUpdateSchema);
    await connectToDatabase();
    const user = await staff(staffId);
    if (user.id === actor.id && (input.roleId || input.isActive === false))
      throw new AppError(
        "You cannot change your own role or deactivate your own account.",
        400,
      );
    await assertCanRemoveSuperAdminAccess(user.id, input.roleId, input.isActive);
    if (input.name !== undefined) user.name = input.name;
    if (input.phone !== undefined) user.phone = input.phone ?? undefined;
    if (input.avatarUrl !== undefined) user.avatarUrl = input.avatarUrl;
    let sensitive = false;
    if (input.roleId && String(user.roleId) !== input.roleId) {
      await assertStaffRole(input.roleId);
      user.roleId = new Types.ObjectId(input.roleId);
      user.tokenVersion += 1;
      sensitive = true;
    }
    if (input.isActive !== undefined)
      sensitive =
        applyActivationState(
          user,
          input.isActive,
          actor.id,
          input.deactivationReason ?? "",
        ) || sensitive;
    await user.save();
    if (sensitive)
      await revokeUserSessions(user.id, "Administrative staff update.");
    if (input.profile) {
      const profile = await StaffProfile.findOne({ userId: user._id });
      if (!profile) throw new AppError("Staff profile not found.", 404);
      Object.assign(profile, {
        ...input.profile,
        joiningDate: input.profile.joiningDate
          ? new Date(input.profile.joiningDate)
          : input.profile.joiningDate,
      });
      await profile.save();
    }
    await writeAuditLog({
      actorUserId: actor.id,
      action: "staff.updated",
      entityType: "user",
      entityId: user.id,
      description: `Staff ${user.email} updated.`,
    });
    return successResponse(await serializeStaff(user.id), "Staff updated.");
  } catch (e) {
    return handleApiError(e);
  }
}
export async function DELETE(
  _: Request,
  c: { params: Promise<{ staffId: string }> },
) {
  try {
    const actor = await requirePermission("users.activate");
    const { staffId } = await c.params;
    if (staffId === actor.id)
      throw new AppError("You cannot deactivate your own account.", 400);
    await connectToDatabase();
    const user = await staff(staffId);
    await assertCanRemoveSuperAdminAccess(user.id, undefined, false);
    applyActivationState(user, false, actor.id, "Administrative deactivation.");
    await user.save();
    await revokeUserSessions(user.id, "Staff deactivated.");
    await writeAuditLog({ actorUserId: actor.id, action: "staff.deactivated", entityType: "user", entityId: user.id, description: `Staff ${user.email} deactivated.` });
    return successResponse(null, "Staff deactivated.");
  } catch (e) {
    return handleApiError(e);
  }
}
