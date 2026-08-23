import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { completeStockTransfer } from "@/services/inventoryOperations.service";
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) { try { const actor = await requirePermission("inventory.manage"); const { id } = await context.params; await connectToDatabase(); return successResponse(await completeStockTransfer(id, actor.id), "Stock transfer completed."); } catch (error) { return handleApiError(error); } }
