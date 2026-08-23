import { Types } from "mongoose";
import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { ReportDefinition } from "@/models/ReportDefinition";
import { ReportAudit } from "@/models/ReportAudit";
import { executeReportPreview } from "@/services/report-builder.service";
import { createReportCsv, createReportPdf, createReportWorkbook, reportExportFilename } from "@/services/report-builder-export.service";
import type { ReportDefinitionInput } from "@/types/report-builder";

export async function GET(_request: Request, context: { params: Promise<{ id: string; format: string }> }) {
  try {
    const actor = await requirePermission("reports.read");
    const { id, format } = await context.params;
    if (!Types.ObjectId.isValid(id)) throw new AppError("Invalid report.", 422);
    if (!(["csv", "xlsx", "pdf"] as string[]).includes(format)) throw new AppError("Export format must be CSV, XLSX or PDF.", 422);
    await connectToDatabase();
    const report = await ReportDefinition.findOne({ _id: id, isArchived: false, $or: [{ createdBy: actor.id }, { visibility: { $in: ["team", "organization"] } }] }).lean();
    if (!report) throw new AppError("Report not found or unavailable for export.", 404);
    const definition = report as unknown as ReportDefinitionInput;
    const result = await executeReportPreview({
      dataset: definition.dataset, columns: definition.columns, filters: definition.filters, groups: definition.groups, sort: definition.sort,
      visualization: definition.visualization, chart: definition.chart, limit: 500,
    }, actor.id, id);
    const typedFormat = format as "csv" | "xlsx" | "pdf";
    const bytes = typedFormat === "csv" ? createReportCsv(result) : typedFormat === "xlsx" ? await createReportWorkbook(report.name, result) : await createReportPdf(report.name, result);
    await ReportAudit.create({ reportId: report._id, action: "exported", actorId: actor.id, format: typedFormat, metadata: { rowCount: result.rowCount, durationMs: result.durationMs } });
    const contentType = typedFormat === "csv" ? "text/csv; charset=utf-8" : typedFormat === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf";
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": contentType, "Content-Disposition": `attachment; filename="${reportExportFilename(report.name, typedFormat)}"`, "Cache-Control": "private, no-store" } });
  } catch (error) { return handleApiError(error); }
}
