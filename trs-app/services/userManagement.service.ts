import {
  Types,
  type HydratedDocument,
} from "mongoose";
import type { UserDocument } from "@/models/User";
import { AppError } from "@/lib/errors/AppError";
import { AuthSession } from "@/models/AuthSession";
import { CustomerProfile } from "@/models/CustomerProfile";
import { Role } from "@/models/Role";
import { StaffProfile } from "@/models/StaffProfile";
import { User } from "@/models/User";

export async function getCustomerRoleId() {
  const role = await Role.findOne({ key: "customer" }).select("_id").lean();
  if (!role) throw new AppError("Customer role is not configured.", 500);
  return role._id;
}
export async function assertStaffRole(roleId: string) {
  const role = await Role.findOne({ _id: roleId, key: { $ne: "customer" }, isActive: true }).lean();
  if (!role) throw new AppError("Select a valid active staff role.", 400);
  return role;
}

export async function assertCanRemoveSuperAdminAccess(
  userId: string,
  nextRoleId?: string,
  nextIsActive?: boolean,
) {
  const superAdminRole = await Role.findOne({ key: "super_admin" }).select("_id").lean();
  if (!superAdminRole) return;

  const user = await User.findById(userId).select("roleId isActive").lean();
  if (!user || String(user.roleId) !== String(superAdminRole._id) || !user.isActive) return;

  const removesRole = nextRoleId !== undefined && nextRoleId !== String(superAdminRole._id);
  const deactivates = nextIsActive === false;
  if (!removesRole && !deactivates) return;

  const activeSuperAdmins = await User.countDocuments({
    roleId: superAdminRole._id,
    isActive: true,
  });
  if (activeSuperAdmins <= 1) {
    throw new AppError("At least one active Super Admin account must remain.", 409);
  }
}
export async function revokeUserSessions(userId: string, reason: string) {
  await AuthSession.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date(), revokeReason: reason } });
}
export function applyActivationState(
  user: HydratedDocument<UserDocument>,
  isActive: boolean,
  actorId: string,
  reason = "",
): boolean {
  if (user.isActive === isActive) {
    return false;
  }

  user.isActive = isActive;
  user.tokenVersion += 1;

  if (isActive) {
    user.deactivatedAt = null;
    user.deactivatedBy = null;
    user.deactivationReason = "";
  } else {
    user.deactivatedAt = new Date();
    user.deactivatedBy = new Types.ObjectId(actorId);
    user.deactivationReason = reason;
  }

  return true;
}
export async function serializeCustomer(userId: string) {
  const [user, profile] = await Promise.all([
    User.findById(userId).populate("roleId", "key name").lean(), CustomerProfile.findOne({ userId }).lean(),
  ]);
  if (!user) throw new AppError("Customer not found.", 404);
  return { user, profile };
}
export async function serializeStaff(userId: string) {
  const [user, profile] = await Promise.all([
    User.findById(userId).populate("roleId", "key name").lean(), StaffProfile.findOne({ userId }).lean(),
  ]);
  if (!user) throw new AppError("Staff member not found.", 404);
  return { user, profile };
}
