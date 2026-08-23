import { timingSafeEqual } from "crypto";

import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { autoCompleteOverdueKitchenTickets } from "@/services/kds.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function safeEqual(supplied: string, expected: string) {
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  return suppliedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(suppliedBuffer, expectedBuffer);
}

function isAuthorized(request: Request) {
  const expected = process.env.CRON_SECRET ?? "";
  if (!expected) return false;
  const authorization = request.headers.get("authorization");
  const supplied = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : request.headers.get("x-cron-secret") ?? "";
  return safeEqual(supplied, expected);
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return Response.json(
        { success: false, message: "Unauthorized cron request." },
        { status: 401 },
      );
    }

    if (process.env.KDS_AUTO_COMPLETE_ENABLED === "false") {
      return successResponse({ skipped: true }, "Kitchen auto-completion is disabled.");
    }

    await connectToDatabase();
    const result = await autoCompleteOverdueKitchenTickets();
    return successResponse(result, "Kitchen auto-completion scan completed.");
  } catch (error) {
    return handleApiError(error);
  }
}
