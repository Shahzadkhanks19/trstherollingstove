import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { getInternalConsumptionExecutiveReport } from "@/services/internal-consumption-executive.service";
import { internalConsumptionExecutiveQuerySchema } from "@/validators/internalConsumptionExecutive";

function startOfIndianDay(value: string): Date {
  return new Date(`${value}T00:00:00.000+05:30`);
}

function endOfIndianDay(value: string): Date {
  return new Date(`${value}T23:59:59.999+05:30`);
}

export async function GET(request: Request) {
  try {
    await requirePermission("reports.read");
    const parsed = internalConsumptionExecutiveQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );

    if (!parsed.success) {
      throw new AppError(
        parsed.error.issues[0]?.message ??
          "Invalid executive analytics query.",
        400,
      );
    }

    await connectToDatabase();
    const report = await getInternalConsumptionExecutiveReport({
      from: startOfIndianDay(parsed.data.from),
      to: endOfIndianDay(parsed.data.to),
      saleType: parsed.data.saleType,
    });

    const response = successResponse(
      report,
      "Executive internal-consumption analytics loaded.",
    );
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("Vary", "Cookie");
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
