import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { InventoryScheduledReport } from "@/models/InventoryScheduledReport";
import { inventoryScheduledReportCreateSchema } from "@/validators/inventory-automation";

export async function GET() {
  try {
    await requirePermission("reports.read");
    await connectToDatabase();

    const schedules = await InventoryScheduledReport.find()
      .populate("createdBy", "name email")
      .populate("lastJobId")
      .sort({ enabled: -1, nextRunAt: 1 })
      .lean();

    return successResponse({ schedules });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("reports.read");
    const input = await validateRequestBody(
      request,
      inventoryScheduledReportCreateSchema,
    );

    await connectToDatabase();

    const schedule = await InventoryScheduledReport.create({
      ...input,
      createdBy: actor.id,
    });

    return successResponse(
      schedule,
      "Scheduled inventory report created.",
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
