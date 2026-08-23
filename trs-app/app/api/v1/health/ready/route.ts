import { successResponse } from "@/lib/http/apiResponse";
import { getReadiness } from "@/services/health.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const readiness = await getReadiness();

  return successResponse(
    readiness,
    readiness.status === "healthy"
      ? "Application is ready to receive traffic."
      : "Application is not ready to receive traffic.",
    readiness.status === "healthy" ? 200 : 503,
  );
}
