import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { EnterpriseHealthSnapshot } from "@/models/EnterpriseHealthSnapshot";
export async function GET(){try{await requirePermission("settings.manage");await connectToDatabase();return successResponse(await EnterpriseHealthSnapshot.find().sort({generatedAt:-1}).limit(50).lean());}catch(error){return handleApiError(error);}}
