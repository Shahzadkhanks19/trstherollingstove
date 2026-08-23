import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { createPosOrder } from "@/services/pos-order.service";
import { createPosOrderSchema } from "@/validators/pos";

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("pos.use");
    const input = await validateRequestBody(request, createPosOrderSchema);
    await connectToDatabase();
    const result = await createPosOrder(input, actor.id);
    return successResponse(result, "POS order created and bill saved.", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
