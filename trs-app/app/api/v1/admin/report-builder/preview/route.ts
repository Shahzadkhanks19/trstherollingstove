import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { executeReportPreview } from "@/services/report-builder.service";
import { reportPreviewSchema } from "@/validators/reportBuilder";

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("reports.read");
    const input = reportPreviewSchema.parse(await request.json());
    await connectToDatabase();
    const result = await executeReportPreview(input, actor.id, input.reportId);
    return successResponse(result, "Report preview generated.");
  } catch (error) { return handleApiError(error); }
}
