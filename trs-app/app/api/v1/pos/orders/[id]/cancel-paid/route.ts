import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { cancelPaidPosOrder } from "@/services/pos-operations.service";
import { cancelPaidPosOrderSchema } from "@/validators/pos-operations";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const actor = await requirePermission("pos.manage");
    const input = await validateRequestBody(request, cancelPaidPosOrderSchema);
    const { id } = await context.params;
    await connectToDatabase();
    return successResponse(await cancelPaidPosOrder(id, input, actor.id), "Order cancelled and refund recorded.");
  } catch (error) {
    return handleApiError(error);
  }
}
