import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { InventoryScheduledReport } from "@/models/InventoryScheduledReport";
import { inventoryScheduledReportUpdateSchema } from "@/validators/inventory-automation";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: Request,
  context: Context,
) {
  try {
    await requirePermission("reports.read");
    const { id } = await context.params;
    const input = await validateRequestBody(
      request,
      inventoryScheduledReportUpdateSchema,
    );

    await connectToDatabase();

    const schedule =
      await InventoryScheduledReport.findByIdAndUpdate(
        id,
        { $set: input },
        {
          returnDocument: "after",
          runValidators: true,
        },
      );

    if (!schedule) {
      throw new AppError(
        "Scheduled inventory report not found.",
        404,
      );
    }

    return successResponse(
      schedule,
      "Scheduled inventory report updated.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: Context,
) {
  try {
    await requirePermission("reports.read");
    const { id } = await context.params;
    await connectToDatabase();

    const schedule =
      await InventoryScheduledReport.findByIdAndDelete(id);

    if (!schedule) {
      throw new AppError(
        "Scheduled inventory report not found.",
        404,
      );
    }

    return successResponse(
      { id },
      "Scheduled inventory report deleted.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
