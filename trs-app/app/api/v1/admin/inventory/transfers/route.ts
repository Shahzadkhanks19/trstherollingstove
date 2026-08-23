import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { StockTransfer } from "@/models/StockTransfer";
import { createStockTransfer } from "@/services/inventoryOperations.service";
import { createStockTransferSchema } from "@/validators/inventoryOperations";
export async function GET() { try { await requirePermission("inventory.read"); await connectToDatabase(); return successResponse(await StockTransfer.find().populate("fromWarehouseId toWarehouseId", "name code").sort({ createdAt: -1 }).limit(500).lean()); } catch (error) { return handleApiError(error); } }
export async function POST(request: Request) { try { const actor = await requirePermission("inventory.manage"); const input = await validateRequestBody(request, createStockTransferSchema); await connectToDatabase(); return successResponse(await createStockTransfer({ ...input, actorId: actor.id }), "Stock transfer created.", 201); } catch (error) { return handleApiError(error); } }
