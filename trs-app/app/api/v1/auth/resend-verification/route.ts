import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { User } from "@/models/User";
import { issueEmailVerification } from "@/services/auth.service";
import { resendVerificationSchema } from "@/validators/auth";

export async function POST(request: Request) {
  try {
    const input = await validateRequestBody(request, resendVerificationSchema);
    await connectToDatabase();

    const user = await User.findOne({ email: input.email, isActive: true });

    if (user && !user.emailVerifiedAt) {
      const sent = await issueEmailVerification(user.id, user.email);
      if (!sent) {
        throw new AppError(
          "Email delivery is not configured. Add SMTP settings and try again.",
          503,
          { code: "EMAIL_NOT_CONFIGURED" },
        );
      }
    }

    return successResponse(
      null,
      "If an unverified account exists for this email, a new verification link has been sent.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
