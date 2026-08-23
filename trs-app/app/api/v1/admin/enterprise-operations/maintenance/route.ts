import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { runEnterpriseMaintenance } from "@/services/enterprise-operations.service";
import { enterpriseMaintenanceSchema } from "@/validators/enterprise-operations";
export async function POST(request:Request){try{await requirePermission("settings.manage");await connectToDatabase();const input=enterpriseMaintenanceSchema.parse(await request.json());return successResponse(await runEnterpriseMaintenance(input),input.dryRun?"Maintenance dry run completed.":"Maintenance completed.");}catch(error){return handleApiError(error);}}
