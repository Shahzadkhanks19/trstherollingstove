import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { ExecutiveBIReportRun } from "@/models/ExecutiveBIReportRun";
export async function GET(request:Request){ try{ await requirePermission("reports.read"); const url=new URL(request.url); const limit=Math.min(Math.max(Number(url.searchParams.get("limit")??20),1),100); await connectToDatabase(); const runs=await ExecutiveBIReportRun.find().sort({createdAt:-1}).limit(limit).lean(); return successResponse({runs}); }catch(error){ return handleApiError(error); } }
