import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { approvePurchaseReturn } from "@/services/inventoryOperations.service";
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) { try { const actor = await requirePermission("purchases.manage"); const { id } = await context.params; await connectToDatabase(); return successResponse(await approvePurchaseReturn(id, actor.id), "Purchase return approved."); } catch (error) { return handleApiError(error); } }
