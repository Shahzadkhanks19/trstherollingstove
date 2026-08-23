import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { generateExecutiveBI } from "@/services/executive-bi.service";
import { executiveBIRunSchema } from "@/validators/executive-bi";

export async function POST(request: Request) { try { const actor=await requirePermission("reports.read"); const input=executiveBIRunSchema.parse(await request.json()); await connectToDatabase(); const result=await generateExecutiveBI({...input,source:"manual",requestedBy:actor.id}); return successResponse(result,"Executive BI report generated.",201); } catch(error){ return handleApiError(error); } }
