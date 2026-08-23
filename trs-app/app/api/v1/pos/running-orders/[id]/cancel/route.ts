import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { cancelRunningOrder } from "@/services/pos-operations.service";
import { cancelRunningOrderSchema } from "@/validators/pos-operations";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("pos.manage");
    const input = await validateRequestBody(request, cancelRunningOrderSchema);
    const { id } = await context.params;
    await connectToDatabase();
    return successResponse(await cancelRunningOrder(id, input.reason, actor.id), "Running order cancelled.");
  } catch (error) {
    return handleApiError(error);
  }
}
