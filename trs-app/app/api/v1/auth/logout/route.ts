import { cookies } from "next/headers";

import { ACCESS_COOKIE, clearAuthCookies } from "@/lib/auth/cookies";
import { verifyAccessToken } from "@/lib/auth/tokens";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { AuthSession } from "@/models/AuthSession";

export async function POST() {
  try {
    const token = (await cookies()).get(ACCESS_COOKIE)?.value;

    if (token) {
      try {
        const claims = await verifyAccessToken(token);
        await connectToDatabase();
        await AuthSession.findByIdAndUpdate(claims.sessionId, {
          $set: {
            revokedAt: new Date(),
            revokeReason: "User logout.",
          },
        });
      } catch {
        // A missing/expired access token must never prevent local logout.
      }
    }

    await clearAuthCookies();
    return successResponse(null, "Logout successful.");
  } catch (error) {
    await clearAuthCookies();
    return handleApiError(error);
  }
}
