import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { auditDatabaseIndexes } from "@/services/indexAudit.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePermission("settings.manage");
    await connectToDatabase();

    const report = await auditDatabaseIndexes();

    return successResponse(report, "Database index audit completed.");
  } catch (error) {
    return handleApiError(error);
  }
}
