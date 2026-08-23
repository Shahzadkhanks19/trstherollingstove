import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { SupplierIntelligenceRun } from "@/models/SupplierIntelligenceRun";
export async function GET(request: Request){ try{ await requirePermission("purchases.read"); const url=new URL(request.url); const limit=Math.min(Math.max(Number(url.searchParams.get("limit")??20),1),100); await connectToDatabase(); return successResponse({runs:await SupplierIntelligenceRun.find().sort({createdAt:-1}).limit(limit).lean()}); }catch(error){return handleApiError(error);} }
