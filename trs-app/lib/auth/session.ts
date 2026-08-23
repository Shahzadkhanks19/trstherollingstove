import { cookies } from "next/headers";

import { ACCESS_COOKIE } from "@/lib/auth/cookies";
import { verifyAccessToken } from "@/lib/auth/tokens";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { AuthSession } from "@/models/AuthSession";
import { User } from "@/models/User";
import { getRoleWithPermissions } from "@/services/rbac.service";
import type { AuthenticatedUser, PermissionKey } from "@/types/auth";

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return null;

  try {
    const claims = await verifyAccessToken(token);
    await connectToDatabase();

    const [user, session] = await Promise.all([
      User.findById(claims.userId).lean(),
      AuthSession.findOne({
        _id: claims.sessionId,
        userId: claims.userId,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      }).lean(),
    ]);

    if (!user || !session || !user.isActive) return null;

    const userTokenVersion =
      typeof user.tokenVersion === "number" ? user.tokenVersion : 0;

    if (userTokenVersion !== claims.tokenVersion) return null;

    const role = await getRoleWithPermissions(String(user.roleId));
    if (!role || !role.isActive) return null;

    return {
      id: String(user._id),
      name: user.name,
      email: user.email,
      phone: user.phone || undefined,
      roleId: String(role._id),
      roleKey: role.key,
      permissions: role.permissionIds.map((permission) => permission.key),
      sessionId: String(session._id),
    };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[TRS auth] Access-token validation failed:", error);
    }
    return null;
  }
}

export async function requireAuthenticatedUser() {
  const user = await getAuthenticatedUser();
  if (!user) throw new AppError("Authentication required.", 401);
  return user;
}

export async function requirePermission(permission: PermissionKey) {
  const user = await requireAuthenticatedUser();
  if (!user.permissions.includes(permission)) {
    throw new AppError("Permission denied.", 403);
  }
  return user;
}
