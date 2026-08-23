import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { generateSupplierIntelligence } from "@/services/supplier-intelligence.service";
import { supplierIntelligenceRunSchema } from "@/validators/supplier-intelligence";
export async function POST(request: Request) { try { const actor=await requirePermission("purchases.manage"); const input=supplierIntelligenceRunSchema.parse(await request.json()); await connectToDatabase(); return successResponse(await generateSupplierIntelligence({ ...input, source: "manual", requestedBy: actor.id }), "Supplier intelligence generated.", 201); } catch(error){ return handleApiError(error); } }
