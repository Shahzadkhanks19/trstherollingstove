import { clearAuthCookies } from "@/lib/auth/cookies";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { AuthSession } from "@/models/AuthSession";
import { User } from "@/models/User";
import { writeAuditLog } from "@/services/audit.service";
import { changePasswordSchema } from "@/validators/auth";

export async function PATCH(request: Request) {
  try {
    const actor = await requireAuthenticatedUser();
    const input = await validateRequestBody(
      request,
      changePasswordSchema,
    );

    await connectToDatabase();

    const user = await User.findById(actor.id).select(
      "+passwordHash",
    );

    if (
      !user ||
      !(await verifyPassword(
        input.currentPassword,
        user.passwordHash,
      ))
    ) {
      throw new AppError(
        "Current password is incorrect.",
        400,
      );
    }

    user.passwordHash = await hashPassword(
      input.newPassword,
    );
    user.passwordChangedAt = new Date();
    user.tokenVersion += 1;

    await Promise.all([
      user.save(),
      AuthSession.updateMany(
        {
          userId: user._id,
          revokedAt: null,
        },
        {
          $set: {
            revokedAt: new Date(),
            revokeReason:
              "Password changed from admin security settings.",
          },
        },
      ),
      writeAuditLog({
        actor,
        action: "auth.password_changed",
        module: "authentication",
        entityType: "User",
        entityId: actor.id,
        description:
          "Administrator changed their account password from the admin panel.",
        severity: "warning",
        outcome: "success",
        userAgent:
          request.headers.get("user-agent") ?? "",
        metadata: {
          sessionsRevoked: true,
          source: "admin_security_page",
        },
      }),
    ]);

    await clearAuthCookies();

    return successResponse(
      null,
      "Password changed successfully. Sign in again with your new password.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
