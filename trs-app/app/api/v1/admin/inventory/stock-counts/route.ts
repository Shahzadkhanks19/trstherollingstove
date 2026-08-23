import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { StockCount } from "@/models/StockCount";
import { createStockCount } from "@/services/inventoryOperations.service";
import { createStockCountSchema } from "@/validators/inventoryOperations";
export async function GET() { try { await requirePermission("inventory.read"); await connectToDatabase(); return successResponse(await StockCount.find().populate("warehouseId", "name code").sort({ countedAt: -1 }).limit(500).lean()); } catch (error) { return handleApiError(error); } }
export async function POST(request: Request) { try { const actor = await requirePermission("inventory.manage"); const input = await validateRequestBody(request, createStockCountSchema); await connectToDatabase(); return successResponse(await createStockCount({ ...input, actorId: actor.id }), "Stock count created.", 201); } catch (error) { return handleApiError(error); } }
