import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { InventoryReportRequest } from "@/models/InventoryReportRequest";
import { generateInventoryReport } from "@/services/inventory-report.service";
import { createInventoryReportRequestSchema } from "@/validators/inventory-alerts-reports";

export async function GET(request: Request) {
  try {
    const actor = await requirePermission("reports.read");
    await connectToDatabase();

    const url = new URL(request.url);
    const limit = Math.min(
      Math.max(Number(url.searchParams.get("limit")) || 50, 1),
      200,
    );

    const requests = await InventoryReportRequest.find({
      requestedBy: actor.id,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return successResponse(requests);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("reports.read");
    const input = await validateRequestBody(
      request,
      createInventoryReportRequestSchema,
    );
    await connectToDatabase();

    const reportRequest =
      await InventoryReportRequest.create({
        ...input,
        requestedBy: actor.id,
        status: "processing",
        startedAt: new Date(),
      });

    try {
      const rows = await generateInventoryReport(
        input.reportType,
        {
          ...input.filters,
          from: input.filters.from
            ? new Date(input.filters.from)
            : undefined,
          to: input.filters.to
            ? new Date(input.filters.to)
            : undefined,
        },
      );

      const downloadUrl =
        input.format === "csv"
          ? `/api/v1/admin/reports/inventory/advanced/export?type=${input.reportType}`
          : `/api/v1/admin/reports/inventory/advanced?type=${input.reportType}`;

      reportRequest.status = "completed";
      reportRequest.completedAt = new Date();
      reportRequest.downloadUrl = downloadUrl;
      reportRequest.rowCount = rows.length;
      await reportRequest.save();
    } catch (error) {
      reportRequest.status = "failed";
      reportRequest.completedAt = new Date();
      reportRequest.errorMessage =
        error instanceof Error
          ? error.message
          : "Report generation failed.";
      await reportRequest.save();
    }

    return successResponse(
      reportRequest,
      "Inventory report request processed.",
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
