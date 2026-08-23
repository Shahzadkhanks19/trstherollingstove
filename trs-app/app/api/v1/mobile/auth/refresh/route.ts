import { authConfig } from "@/config/auth";
import { verifyRefreshToken } from "@/lib/auth/tokens";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { rotateSession } from "@/services/auth.service";
import { mobileRefreshSchema } from "@/validators/mobile";

export async function POST(request: Request) {
  try {
    const input = await validateRequestBody(request, mobileRefreshSchema);
    const claims = await verifyRefreshToken(input.refreshToken);
    const tokens = await rotateSession(input.refreshToken, claims);

    return successResponse(
      {
        ...tokens,
        accessTokenExpiresIn: authConfig.ACCESS_TOKEN_TTL_SECONDS,
        refreshTokenExpiresIn: authConfig.REFRESH_TOKEN_TTL_SECONDS,
      },
      "Mobile session refreshed.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
