import { requireMobileCustomer } from "@/lib/auth/mobileSession";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { revokeMobileDevice, revokeMobileSession } from "@/services/mobile.service";
import { mobileLogoutSchema } from "@/validators/mobile";

export async function POST(request: Request) {
  try {
    const actor = await requireMobileCustomer(request);
    const input = await validateRequestBody(request, mobileLogoutSchema);

    await Promise.all([
      revokeMobileSession(actor.id, actor.sessionId),
      revokeMobileDevice(actor.id, input.installationId),
    ]);

    return successResponse(null, "Mobile logout successful.");
  } catch (error) {
    return handleApiError(error);
  }
}
