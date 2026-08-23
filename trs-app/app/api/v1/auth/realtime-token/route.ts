import { cookies } from "next/headers";

import { ACCESS_COOKIE } from "@/lib/auth/cookies";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import {
  signRealtimeAccessToken,
  verifyAccessToken,
} from "@/lib/auth/tokens";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";

const REALTIME_TOKEN_TTL_SECONDS = 300;

export async function GET() {
  try {
    await requireAuthenticatedUser();

    const accessToken = (await cookies()).get(ACCESS_COOKIE)?.value;
    if (!accessToken) {
      return successResponse(
        { authenticated: false, token: null, expiresAt: null },
        "Realtime authentication is unavailable.",
      );
    }

    const claims = await verifyAccessToken(accessToken);
    const token = await signRealtimeAccessToken(
      claims,
      REALTIME_TOKEN_TTL_SECONDS,
    );

    return successResponse(
      {
        authenticated: true,
        token,
        expiresAt: new Date(
          Date.now() + REALTIME_TOKEN_TTL_SECONDS * 1_000,
        ).toISOString(),
      },
      "Realtime token issued.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
