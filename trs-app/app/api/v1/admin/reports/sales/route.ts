import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { resolveReportRange } from "@/lib/reports/query";
import {
  getPaymentReport,
  getSalesReport,
  getWaiterTipReport,
} from "@/services/report.service";
import { reportRangeQuerySchema } from "@/validators/reports";

export async function GET(request: Request) {
  try {
    await requirePermission("reports.read");

    const url = new URL(request.url);
    const parsed = reportRangeQuerySchema.safeParse(
      Object.fromEntries(url.searchParams),
    );

    if (!parsed.success) {
      throw new AppError(
        parsed.error.issues[0]?.message ??
          "Invalid report query.",
        400,
      );
    }

    await connectToDatabase();

    const range = resolveReportRange(
      parsed.data.from,
      parsed.data.to,
    );

    const [sales, payments, waiterTips] = await Promise.all([
      getSalesReport(range),
      getPaymentReport(range),
      getWaiterTipReport(range),
    ]);

    return successResponse({
      ...sales,
      payments,
      waiterTips,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
