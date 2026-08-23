import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { createTable, listTablesWithOccupancy } from "@/services/pos-operations.service";
import { createTableSchema } from "@/validators/pos-operations";
export async function GET() { try { await requirePermission("pos.use"); await connectToDatabase(); return successResponse(await listTablesWithOccupancy()); } catch (error) { return handleApiError(error); } }
export async function POST(request: Request) { try { const actor = await requirePermission("pos.manage"); const input = await validateRequestBody(request, createTableSchema); await connectToDatabase(); return successResponse(await createTable(input, actor.id), "Table created.", 201); } catch (error) { return handleApiError(error); } }
