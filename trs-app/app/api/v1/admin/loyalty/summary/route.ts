import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { getLoyaltyAdminSummary } from "@/services/loyalty.service";
export async function GET(){try{await requirePermission("reports.read");await connectToDatabase();return successResponse(await getLoyaltyAdminSummary(),"Loyalty summary loaded.");}catch(error){return handleApiError(error);}}
