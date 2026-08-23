import { cookies } from "next/headers";

import {
  clearAuthCookies,
  getRememberMePreference,
  REFRESH_COOKIE,
  setAuthCookies,
} from "@/lib/auth/cookies";
import { verifyRefreshToken } from "@/lib/auth/tokens";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { rotateSession } from "@/services/auth.service";

export async function POST() {
  try {
    const cookieStore = await cookies();

    const refreshToken =
      cookieStore.get(REFRESH_COOKIE)?.value;

    if (!refreshToken) {
      throw new AppError(
        "Refresh token is missing.",
        401,
      );
    }

    const claims =
      await verifyRefreshToken(
        refreshToken,
      );

    const nextSession =
      await rotateSession(
        refreshToken,
        claims,
      );

    const rememberMe =
      await getRememberMePreference();

    await setAuthCookies(
      nextSession.accessToken,
      nextSession.refreshToken,
      rememberMe,
    );

    return successResponse(
      null,
      "Session refreshed.",
    );
  } catch (error) {
    await clearAuthCookies();
    return handleApiError(error);
  }
}