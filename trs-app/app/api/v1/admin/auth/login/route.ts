import { NextResponse } from "next/server";

import { authConfig } from "@/config/auth";
import { ACCESS_COOKIE, REFRESH_COOKIE, REMEMBER_COOKIE } from "@/lib/auth/cookies";
import { getRequestMetadata } from "@/lib/auth/requestMeta";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { Role } from "@/models/Role";
import { authenticate, createSession } from "@/services/auth.service";
import { writeAuditLog } from "@/services/audit.service";
import { loginSchema } from "@/validators/auth";

export async function POST(request: Request) {
  try {
    const input = await validateRequestBody(request, loginSchema);
    const metadata = await getRequestMetadata();
    const user = await authenticate(input.identifier, input.password);

    await connectToDatabase();
    const role = await Role.findById(user.roleId).lean();

    if (!role || !role.isActive || role.key === "customer" || role.key === "user") {
      throw new AppError("This account does not have admin access.", 403);
    }

    const session = await createSession(
      user,
      metadata,
      authConfig.ADMIN_ACCESS_TOKEN_TTL_SECONDS,
    );
    const response = NextResponse.json({
      success: true,
      message: "Admin login successful.",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        roleKey: role.key,
      },
    });

    const hostname = new URL(request.url).hostname;
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
    const baseCookieOptions = {
      httpOnly: true,
      secure: isLocalhost ? false : authConfig.AUTH_COOKIE_SECURE === "true",
      sameSite: "lax" as const,
      path: "/",
      ...(!isLocalhost && authConfig.AUTH_COOKIE_DOMAIN
        ? { domain: authConfig.AUTH_COOKIE_DOMAIN }
        : {}),
    };

    response.cookies.set(ACCESS_COOKIE, session.accessToken, {
      ...baseCookieOptions,
      maxAge: authConfig.ADMIN_ACCESS_TOKEN_TTL_SECONDS,
    });

    response.cookies.set(REFRESH_COOKIE, session.refreshToken, {
      ...baseCookieOptions,
      maxAge: authConfig.REFRESH_TOKEN_TTL_SECONDS,
    });

    response.cookies.set(REMEMBER_COOKIE, "true", {
      ...baseCookieOptions,
      maxAge: authConfig.REFRESH_TOKEN_TTL_SECONDS,
    });

    await writeAuditLog({
      actorUserId: user.id,
      action: "admin.login",
      entityType: "auth_session",
      entityId: session.session.id,
      description: `${user.email} signed in to the admin dashboard.`,
      metadata,
    });

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
