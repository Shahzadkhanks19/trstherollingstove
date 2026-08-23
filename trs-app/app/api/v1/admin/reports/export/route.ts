import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { rowsToCsv } from "@/lib/reports/csv";
import { resolveReportRange } from "@/lib/reports/query";
import { getExportRows } from "@/services/report.service";
import { reportExportQuerySchema } from "@/validators/reports";

export async function GET(request: Request) {
  try {
    await requirePermission("reports.read");

    const url = new URL(request.url);
    const parsed = reportExportQuerySchema.safeParse(
      Object.fromEntries(url.searchParams),
    );

    if (!parsed.success) {
      throw new AppError(
        parsed.error.issues[0]?.message ??
          "Invalid export query.",
        400,
      );
    }

    await connectToDatabase();

    const range = resolveReportRange(
      parsed.data.from,
      parsed.data.to,
    );

    const rows = await getExportRows(
      parsed.data.report,
      range,
    );
    const csv = rowsToCsv(rows);
    const filename = [
      "trs",
      parsed.data.report,
      range.from.toISOString().slice(0, 10),
      range.to.toISOString().slice(0, 10),
    ].join("-");

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type":
          "text/csv; charset=utf-8",
        "Content-Disposition":
          `attachment; filename="${filename}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
