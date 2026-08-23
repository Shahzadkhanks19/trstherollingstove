import { requirePermission } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { runFinanceJob } from "@/services/finance-scheduled-jobs.service";
import { financeJobRunSchema } from "@/validators/finance-scheduled-jobs";
export async function POST(request:Request){try{const actor=await requirePermission("settings.manage");const input=await validateRequestBody(request,financeJobRunSchema);return successResponse(await runFinanceJob({...input,triggeredBy:actor.id,triggeredByName:actor.name}),"Finance job completed.");}catch(error){return handleApiError(error);}}
