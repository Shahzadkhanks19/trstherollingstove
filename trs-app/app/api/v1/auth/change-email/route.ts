import { clearAuthCookies } from "@/lib/auth/cookies";
import { verifyPassword } from "@/lib/auth/password";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { AuthSession } from "@/models/AuthSession";
import { User } from "@/models/User";
import { writeAuditLog } from "@/services/audit.service";
import { changeEmailSchema } from "@/validators/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PATCH(request: Request) {
  try {
    const actor = await requireAuthenticatedUser();
    const input = await validateRequestBody(
      request,
      changeEmailSchema,
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

    const nextEmail = input.newEmail.trim().toLowerCase();
    const currentEmail = user.email.trim().toLowerCase();

    if (nextEmail === currentEmail) {
      throw new AppError(
        "New login email must be different from the current email.",
        400,
      );
    }

    const existingUser = await User.exists({
      _id: { $ne: user._id },
      email: nextEmail,
    });

    if (existingUser) {
      throw new AppError(
        "This email address is already used by another account.",
        409,
      );
    }

    user.email = nextEmail;
    user.emailVerifiedAt = new Date();
    user.tokenVersion += 1;

    const now = new Date();

    await Promise.all([
      user.save(),
      AuthSession.updateMany(
        {
          userId: user._id,
          revokedAt: null,
        },
        {
          $set: {
            revokedAt: now,
            revokeReason:
              "Login email changed from admin security settings.",
          },
        },
      ),
      writeAuditLog({
        actor,
        action: "auth.email_changed",
        module: "authentication",
        entityType: "User",
        entityId: actor.id,
        description:
          "Administrator changed their login email from the admin panel.",
        severity: "warning",
        outcome: "success",
        userAgent:
          request.headers.get("user-agent") ?? "",
        metadata: {
          previousEmail: currentEmail,
          newEmail: nextEmail,
          sessionsRevoked: true,
          source: "admin_security_page",
        },
      }),
    ]);

    await clearAuthCookies();

    return successResponse(
      { email: nextEmail },
      "Login email changed successfully. Sign in again with your new email.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
