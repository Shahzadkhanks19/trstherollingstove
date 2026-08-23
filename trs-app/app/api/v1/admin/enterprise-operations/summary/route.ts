import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { getEnterpriseOperationsSummary } from "@/services/enterprise-operations.service";
export async function GET(){try{await requirePermission("settings.manage");await connectToDatabase();return successResponse(await getEnterpriseOperationsSummary());}catch(error){return handleApiError(error);}}
