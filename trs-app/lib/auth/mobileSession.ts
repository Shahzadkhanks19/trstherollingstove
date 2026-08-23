import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { verifyAccessToken } from "@/lib/auth/tokens";
import { AuthSession } from "@/models/AuthSession";
import { User } from "@/models/User";
import { getRoleWithPermissions } from "@/services/rbac.service";
import type { AuthenticatedUser } from "@/types/auth";

function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

export async function getMobileAuthenticatedUser(
  request: Request,
): Promise<AuthenticatedUser | null> {
  const token = readBearerToken(request);
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

    if (
      !user ||
      !session ||
      !user.isActive ||
      user.tokenVersion !== claims.tokenVersion
    ) {
      return null;
    }

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
  } catch {
    return null;
  }
}

export async function requireMobileCustomer(request: Request) {
  const user = await getMobileAuthenticatedUser(request);

  if (!user) {
    throw new AppError("Authentication required.", 401);
  }

  if (user.roleKey !== "customer") {
    throw new AppError("Customer access required.", 403);
  }

  return user;
}
