import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { processOfflineSync } from "@/services/pos-hardening.service";
import { offlineSyncSchema } from "@/validators/pos-hardening";

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("pos.use");
    const input = await validateRequestBody(request, offlineSyncSchema);
    await connectToDatabase();
    const results = await processOfflineSync(input, actor.id);
    return successResponse({
      results,
      completed: results.filter((item) => item.status === "completed").length,
      failed: results.filter((item) => item.status === "failed").length,
    }, "Offline POS operations synchronized.");
  } catch (error) {
    return handleApiError(error);
  }
}
