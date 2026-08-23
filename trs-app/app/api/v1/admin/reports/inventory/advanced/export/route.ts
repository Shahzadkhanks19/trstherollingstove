import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { rowsToCsv } from "@/lib/reports/csv";
import { generateInventoryReport } from "@/services/inventory-report.service";
import { inventoryReportQuerySchema } from "@/validators/inventory-alerts-reports";

export async function GET(request: Request) {
  try {
    await requirePermission("reports.read");
    const url = new URL(request.url);
    const parsed = inventoryReportQuerySchema.safeParse(
      Object.fromEntries(url.searchParams),
    );

    if (!parsed.success) {
      throw new AppError(
        parsed.error.issues[0]?.message ??
          "Invalid inventory report query.",
        400,
      );
    }

    await connectToDatabase();
    const { type, ...filters } = parsed.data;
    const rows = await generateInventoryReport(type, filters);
    const csv = rowsToCsv(rows);
    const date = new Date().toISOString().slice(0, 10);

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          `attachment; filename="trs-inventory-${type}-${date}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
