import { requirePermission } from "@/lib/auth/session";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { InternalConsumptionAudit } from "@/models/InternalConsumptionAudit";
import {
  internalConsumptionFinancialsToCsv,
  internalConsumptionFinancialsToPdf,
  internalConsumptionFinancialsToXlsx,
} from "@/services/internal-consumption-financials-export.service";
import { getInternalConsumptionFinancialReport } from "@/services/internal-consumption-financials.service";
import { internalConsumptionFinancialsQuerySchema } from "@/validators/internalConsumptionFinancials";

function startOfIndianDay(value: string): Date {
  return new Date(`${value}T00:00:00.000+05:30`);
}

function endOfIndianDay(value: string): Date {
  return new Date(`${value}T23:59:59.999+05:30`);
}

export async function GET(request: Request) {
  try {
    const actor = await requirePermission("reports.read");
    const url = new URL(request.url);
    const parsed = internalConsumptionFinancialsQuerySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid financial report query.", 400);
    }

    const report = await getInternalConsumptionFinancialReport({
      from: startOfIndianDay(parsed.data.from),
      to: endOfIndianDay(parsed.data.to),
    });

    if (parsed.data.format === "json") {
      return successResponse(report, "Financial report loaded.");
    }

    await InternalConsumptionAudit.create({
      action: "report_exported",
      actorId: actor.id,
      actorName: actor.name,
      reason: `financial_${parsed.data.format}_export`,
      metadata: { from: parsed.data.from, to: parsed.data.to, report: "phase_4_2_2_financials" },
    });

    const filename = `trs-financials-${parsed.data.from}-to-${parsed.data.to}`;
    if (parsed.data.format === "csv") {
      return new Response(internalConsumptionFinancialsToCsv(report), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
          "Cache-Control": "private, no-store",
        },
      });
    }
    if (parsed.data.format === "xlsx") {
      return new Response(new Uint8Array(await internalConsumptionFinancialsToXlsx(report)), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
          "Cache-Control": "private, no-store",
        },
      });
    }
    return new Response(new Uint8Array(await internalConsumptionFinancialsToPdf(report)), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
