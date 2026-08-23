import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import {
  restoreLogicalBackup,
} from "@/services/restore.service";
import {
  restorePayloadSchema,
} from "@/validators/dataTransfer";

export async function POST(
  request: Request,
) {
  try {
    await requirePermission(
      "settings.manage",
    );

    const input =
      await validateRequestBody(
        request,
        restorePayloadSchema,
      );

    await connectToDatabase();

    const result =
      await restoreLogicalBackup(
        input,
      );

    return successResponse(
      result,
      input.dryRun
        ? "Restore validation completed."
        : "Restore completed.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
