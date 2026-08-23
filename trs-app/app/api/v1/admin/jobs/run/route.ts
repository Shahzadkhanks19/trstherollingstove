import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import {
  runBackgroundWorker,
} from "@/services/jobRunner.service";
import {
  runWorkerSchema,
} from "@/validators/jobs";

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
        runWorkerSchema,
      );

    await connectToDatabase();

    const result =
      await runBackgroundWorker(
        input.limit,
      );

    return successResponse(
      result,
      "Background worker completed.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
