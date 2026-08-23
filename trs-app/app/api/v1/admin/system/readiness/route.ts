import {
  requirePermission,
} from "@/lib/auth/session";
import {
  connectToDatabase,
} from "@/lib/db/mongoose";
import {
  handleApiError,
} from "@/lib/errors/handleApiError";
import {
  successResponse,
} from "@/lib/http/apiResponse";
import {
  createProductionReadinessReport,
} from "@/services/productionReadiness.service";

export async function GET() {
  try {
    await requirePermission(
      "settings.manage",
    );
    await connectToDatabase();

    const report =
      await createProductionReadinessReport();

    return successResponse(
      report,
      report.ready
        ? "Production readiness checks passed."
        : "Production readiness checks found failures.",
      report.ready ? 200 : 503,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
