import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { PurchaseReturn } from "@/models/PurchaseReturn";
import { createPurchaseReturn } from "@/services/inventoryOperations.service";
import { createPurchaseReturnSchema } from "@/validators/inventoryOperations";
export async function GET() { try { await requirePermission("purchases.read"); await connectToDatabase(); return successResponse(await PurchaseReturn.find().populate("supplierId", "name code").sort({ returnDate: -1 }).limit(500).lean()); } catch (error) { return handleApiError(error); } }
export async function POST(request: Request) { try { const actor = await requirePermission("purchases.manage"); const input = await validateRequestBody(request, createPurchaseReturnSchema); await connectToDatabase(); return successResponse(await createPurchaseReturn({ ...input, actorId: actor.id }), "Purchase return created.", 201); } catch (error) { return handleApiError(error); } }
