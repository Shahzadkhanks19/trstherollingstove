import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { createCustomer } from "@/services/auth.service";
import { registerSchema } from "@/validators/auth";
import { requirePublicOrderingEnabled } from "@/lib/public-ordering";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requirePublicOrderingEnabled();
    const input = await validateRequestBody(request, registerSchema);
    const { user, verificationEmailSent } = await createCustomer(input);

    return successResponse(
      { id: user.id, name: user.name, email: user.email, verificationEmailSent },
      verificationEmailSent
        ? "Registration successful. Check your email for the verification link."
        : "Registration successful, but email delivery is not configured yet. Configure SMTP and resend the verification link.",
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
