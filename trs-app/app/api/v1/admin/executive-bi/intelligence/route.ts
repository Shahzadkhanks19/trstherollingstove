import { requirePermission } from "@/lib/auth/session";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { getExecutiveBIIntelligence } from "@/services/executive-bi-intelligence.service";
import {
  executiveBIIntelligenceToCsv,
  executiveBIIntelligenceToPdf,
  executiveBIIntelligenceToXlsx,
} from "@/services/executive-bi-intelligence-export.service";
import { executiveBIIntelligenceQuerySchema } from "@/validators/executiveBIIntelligence";

export async function GET(request: Request) {
  try {
    const actor = await requirePermission("reports.read");
    const parsed = executiveBIIntelligenceQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message ?? "Invalid executive intelligence query.", 400);
    const report = await getExecutiveBIIntelligence({
      lookbackDays: parsed.data.lookbackDays,
      requestedBy: actor.id,
      refresh: parsed.data.refresh,
    });
    if (parsed.data.format === "json") return successResponse(report, "Executive intelligence generated.");
    const filename = `trs-executive-intelligence-${new Date().toISOString().slice(0, 10)}`;
    if (parsed.data.format === "csv") {
      return new Response(executiveBIIntelligenceToCsv(report), {
        headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}.csv"`, "Cache-Control": "private, no-store" },
      });
    }
    const body = parsed.data.format === "xlsx"
      ? await executiveBIIntelligenceToXlsx(report)
      : await executiveBIIntelligenceToPdf(report);
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
