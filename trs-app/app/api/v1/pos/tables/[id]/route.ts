import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { updateTable } from "@/services/pos-operations.service";
import { updateTableSchema } from "@/validators/pos-operations";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) { try { const actor = await requirePermission("pos.manage"); const input = await validateRequestBody(request, updateTableSchema); const { id } = await context.params; await connectToDatabase(); return successResponse(await updateTable(id, input, actor.id), "Table updated."); } catch (error) { return handleApiError(error); } }
