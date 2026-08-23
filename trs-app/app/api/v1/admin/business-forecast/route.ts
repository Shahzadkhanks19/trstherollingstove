import { requirePermission } from "@/lib/auth/session";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { getBusinessForecast } from "@/services/business-forecast.service";
import { businessForecastToCsv, businessForecastToPdf, businessForecastToXlsx } from "@/services/business-forecast-export.service";
import { businessForecastQuerySchema } from "@/validators/businessForecast";

export async function GET(request: Request) {
  try {
    const actor = await requirePermission("reports.read"); const url = new URL(request.url);
    const parsed = businessForecastQuerySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message ?? "Invalid forecast query.", 400);
    const report = await getBusinessForecast({ lookbackDays: parsed.data.lookbackDays, requestedBy: actor.id, refresh: parsed.data.refresh });
    if (parsed.data.format === "json") return successResponse(report, "Forecast generated.");
    const filename = `trs-business-forecast-${new Date().toISOString().slice(0,10)}`;
    if (parsed.data.format === "csv") return new Response(businessForecastToCsv(report), { headers: { "Content-Type":"text/csv; charset=utf-8", "Content-Disposition":`attachment; filename="${filename}.csv"`, "Cache-Control":"private, no-store" } });
    const body = parsed.data.format === "xlsx" ? await businessForecastToXlsx(report) : await businessForecastToPdf(report);
    return new Response(new Uint8Array(body), { headers: { "Content-Type": parsed.data.format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf", "Content-Disposition":`attachment; filename="${filename}.${parsed.data.format}"`, "Cache-Control":"private, no-store" } });
  } catch (error) { return handleApiError(error); }
}
