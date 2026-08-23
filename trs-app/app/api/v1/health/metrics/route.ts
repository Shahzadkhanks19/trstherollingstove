import { successResponse } from "@/lib/http/apiResponse";
import { getRuntimeMetrics } from "@/services/health.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return successResponse(getRuntimeMetrics(), "Runtime metrics retrieved.");
}
