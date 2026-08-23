import { successResponse } from "@/lib/http/apiResponse";
import { getLiveness } from "@/services/health.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return successResponse(getLiveness(), "Application process is alive.");
}
