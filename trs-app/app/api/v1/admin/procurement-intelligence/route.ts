import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import {
  procurementIntelligenceToCsv,
  procurementIntelligenceToPdf,
  procurementIntelligenceToXlsx,
} from "@/services/procurement-intelligence-export.service";
import { getProcurementIntelligence } from "@/services/procurement-intelligence.service";
import { procurementIntelligenceQuerySchema } from "@/validators/procurementIntelligence";

export async function GET(request: Request) {
  try {
    const actor = await requirePermission("purchases.read");
    const parsed = procurementIntelligenceQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );
    if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message ?? "Invalid procurement query.", 400);
    await connectToDatabase();
    const report = await getProcurementIntelligence({
      lookbackDays: parsed.data.lookbackDays,
      horizonDays: parsed.data.horizonDays,
      leadTimeDays: parsed.data.leadTimeDays,
      refresh: parsed.data.refresh,
      requestedBy: actor.id,
    });
    if (parsed.data.format === "json") return successResponse(report, "Procurement intelligence generated.");
    const filename = `trs-procurement-plan-${new Date().toISOString().slice(0, 10)}`;
    if (parsed.data.format === "csv") {
      return new Response(procurementIntelligenceToCsv(report), {
        headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}.csv"`, "Cache-Control": "private, no-store" },
      });
    }
    const body = parsed.data.format === "xlsx"
      ? await procurementIntelligenceToXlsx(report)
      : await procurementIntelligenceToPdf(report);
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": parsed.data.format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.${parsed.data.format}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
