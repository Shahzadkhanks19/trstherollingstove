import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { updateRunningOrder } from "@/services/pos-operations.service";
import { updateRunningOrderSchema } from "@/validators/pos-operations";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) { try { const actor = await requirePermission("pos.use"); const input = await validateRequestBody(request, updateRunningOrderSchema); const { id } = await context.params; await connectToDatabase(); return successResponse(await updateRunningOrder(id, input, actor.id), input.sendToKitchen ? "Order sent to kitchen." : "Running order updated."); } catch (error) { return handleApiError(error); } }
