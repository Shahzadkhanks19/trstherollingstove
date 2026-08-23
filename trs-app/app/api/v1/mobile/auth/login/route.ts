import { authConfig } from "@/config/auth";
import { getRequestMetadata } from "@/lib/auth/requestMeta";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { authenticate, createSession } from "@/services/auth.service";
import { upsertMobileDevice } from "@/services/mobile.service";
import { serializeCustomer } from "@/services/userManagement.service";
import { mobileLoginSchema } from "@/validators/mobile";

export async function POST(request: Request) {
  try {
    const input = await validateRequestBody(request, mobileLoginSchema);
    const metadata = await getRequestMetadata();
    const user = await authenticate(input.identifier, input.password);
    const session = await createSession(user, metadata);

    await upsertMobileDevice(user.id, {
      installationId: input.installationId,
      platform: input.platform,
      pushToken: input.pushToken,
      deviceName: input.deviceName,
      appVersion: input.appVersion,
      osVersion: input.osVersion,
      locale: input.locale,
      timezone: input.timezone,
    });

    return successResponse(
      {
        user: await serializeCustomer(user.id),
        tokens: {
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          accessTokenExpiresIn: authConfig.ACCESS_TOKEN_TTL_SECONDS,
          refreshTokenExpiresIn: authConfig.REFRESH_TOKEN_TTL_SECONDS,
        },
      },
      "Mobile login successful.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
