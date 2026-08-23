import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { createAndRunInventoryJob } from "@/services/inventory-automation.service";
import { inventoryAutomationRunSchema } from "@/validators/inventory-automation";

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("inventory.manage");
    const input = await validateRequestBody(
      request,
      inventoryAutomationRunSchema,
    );

    await connectToDatabase();

    const job = await createAndRunInventoryJob({
      jobType: input.jobType,
      payload: input.payload,
      source: "manual",
      createdBy: actor.id,
      maxAttempts: input.maxAttempts,
    });

    return successResponse(
      job,
      "Inventory automation job completed.",
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
