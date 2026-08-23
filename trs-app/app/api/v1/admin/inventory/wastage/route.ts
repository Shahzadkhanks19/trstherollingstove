import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { WasteEntry } from "@/models/WasteEntry";
import { createWasteEntry } from "@/services/inventoryOperations.service";
import { createWasteEntrySchema } from "@/validators/inventoryOperations";
export async function GET() { try { await requirePermission("inventory.read"); await connectToDatabase(); return successResponse(await WasteEntry.find().populate("inventoryItemId", "name sku unit").sort({ occurredAt: -1 }).limit(500).lean()); } catch (error) { return handleApiError(error); } }
export async function POST(request: Request) { try { const actor = await requirePermission("inventory.manage"); const input = await validateRequestBody(request, createWasteEntrySchema); await connectToDatabase(); return successResponse(await createWasteEntry({ ...input, actorId: actor.id }), "Wastage recorded.", 201); } catch (error) { return handleApiError(error); } }
