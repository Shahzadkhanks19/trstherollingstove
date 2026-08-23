import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { ensureDefaultSettings } from "@/services/settings.service";

export async function POST() {
  try {
    const actor = await requirePermission(
      "settings.manage",
    );

    await connectToDatabase();
    await ensureDefaultSettings(actor.id);

    return successResponse(
      null,
      "Default settings initialized.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
