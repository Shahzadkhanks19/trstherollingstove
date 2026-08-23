import { requirePermission } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { getFinanceJobsSummary } from "@/services/finance-scheduled-jobs.service";
import { financeJobQuerySchema } from "@/validators/finance-scheduled-jobs";
export async function GET(request:Request){try{await requirePermission("reports.read");const url=new URL(request.url);const{days}=financeJobQuerySchema.parse({days:url.searchParams.get("days")??30});return successResponse(await getFinanceJobsSummary(days));}catch(error){return handleApiError(error);}}
