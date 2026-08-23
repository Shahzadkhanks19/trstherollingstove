import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { updateKitchenTicketStatus } from "@/services/kds.service";
import { updateTicketStatusSchema } from "@/validators/kds";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: Request,
  context: Context,
) {
  try {
    const actor = await requirePermission("kds.use");
    const { id } = await context.params;
    const input = await validateRequestBody(
      request,
      updateTicketStatusSchema,
    );

    await connectToDatabase();

    const ticket = await updateKitchenTicketStatus(
      id,
      input.status,
      actor.id,
    );

    return successResponse(
      ticket,
      "Kitchen ticket status updated.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
