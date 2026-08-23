import { requirePermission } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { closeFinancePeriod } from "@/services/finance-scheduled-jobs.service";
import { financePeriodCloseSchema } from "@/validators/finance-scheduled-jobs";
export async function POST(request:Request){try{const actor=await requirePermission("settings.manage");const input=await validateRequestBody(request,financePeriodCloseSchema);return successResponse(await closeFinancePeriod({...input,closedBy:actor.id,closedByName:actor.name}),"Finance period closed.");}catch(error){return handleApiError(error);}}
