import { requirePermission } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { ttlCache } from "@/lib/performance/ttlCache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePermission("settings.manage");

    return successResponse(ttlCache.stats(), "Cache statistics retrieved.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE() {
  try {
    await requirePermission("settings.manage");
    ttlCache.clear();

    return successResponse(ttlCache.stats(), "Application cache cleared.");
  } catch (error) {
    return handleApiError(error);
  }
}
