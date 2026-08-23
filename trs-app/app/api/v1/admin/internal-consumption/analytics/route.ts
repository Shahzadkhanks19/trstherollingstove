import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import {
  getInternalConsumptionAnalytics,
  internalConsumptionAnalyticsToCsv,
} from "@/services/internal-consumption-analytics.service";
import { internalConsumptionAnalyticsToPdf, internalConsumptionAnalyticsToXlsx } from "@/services/internal-consumption-export.service";
import { InternalConsumptionAudit } from "@/models/InternalConsumptionAudit";
import { internalConsumptionAnalyticsQuerySchema } from "@/validators/internalConsumptionAnalytics";

function startOfIndianDay(date: string): Date {
  return new Date(`${date}T00:00:00.000+05:30`);
}

function endOfIndianDay(date: string): Date {
  return new Date(`${date}T23:59:59.999+05:30`);
}

export async function GET(request: Request) {
  try {
    const actor = await requirePermission("reports.read");
    const url = new URL(request.url);
    const parsed = internalConsumptionAnalyticsQuerySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid analytics query.", 400);
    }

    await connectToDatabase();
    const report = await getInternalConsumptionAnalytics({
      from: startOfIndianDay(parsed.data.from),
      to: endOfIndianDay(parsed.data.to),
      saleType: parsed.data.saleType,
    });

    if (parsed.data.format !== "json") {
      await InternalConsumptionAudit.create({ action: "report_exported", actorId: actor.id, actorName: actor.name, reason: `${parsed.data.format} export`, metadata: { from: parsed.data.from, to: parsed.data.to, saleType: parsed.data.saleType } });
      const filename = `trs-internal-consumption-${parsed.data.from}-to-${parsed.data.to}`;
      if (parsed.data.format === "csv") return new Response(internalConsumptionAnalyticsToCsv(report), { status: 200, headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}.csv"`, "Cache-Control": "private, no-store" } });
      if (parsed.data.format === "xlsx") return new Response(new Uint8Array(await internalConsumptionAnalyticsToXlsx(report)), { status: 200, headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${filename}.xlsx"`, "Cache-Control": "private, no-store" } });
      return new Response(new Uint8Array(await internalConsumptionAnalyticsToPdf(report)), { status: 200, headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}.pdf"`, "Cache-Control": "private, no-store" } });
    }

    return successResponse(report, "Internal consumption analytics loaded.");
  } catch (error) {
    return handleApiError(error);
  }
}
