import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { getLatestExecutiveBI } from "@/services/executive-bi.service";
export async function GET(){ try{ await requirePermission("reports.read"); await connectToDatabase(); return successResponse(await getLatestExecutiveBI()); }catch(error){ return handleApiError(error); } }
