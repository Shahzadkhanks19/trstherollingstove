import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { createRunningOrder, listRunningOrders } from "@/services/pos-operations.service";
import { createRunningOrderSchema } from "@/validators/pos-operations";
export async function GET() { try { await requirePermission("pos.use"); await connectToDatabase(); return successResponse(await listRunningOrders()); } catch (error) { return handleApiError(error); } }
export async function POST(request: Request) { try { const actor = await requirePermission("pos.use"); const input = await validateRequestBody(request, createRunningOrderSchema); await connectToDatabase(); return successResponse(await createRunningOrder(input, actor.id), "Running order opened.", 201); } catch (error) { return handleApiError(error); } }
