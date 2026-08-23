import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { getSupplierIntelligenceSummary } from "@/services/supplier-intelligence.service";
export async function GET(request: Request) { try { await requirePermission("purchases.read"); const url=new URL(request.url); await connectToDatabase(); return successResponse(await getSupplierIntelligenceSummary(url.searchParams.get("runId") ?? undefined)); } catch(error){ return handleApiError(error); } }
