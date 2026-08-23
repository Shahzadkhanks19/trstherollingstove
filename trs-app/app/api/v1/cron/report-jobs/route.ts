import { timingSafeEqual } from "crypto";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { enqueueDueScheduledReports, runReportJobWorker } from "@/services/report-job-runner.service";

function authorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET || "";
  if (!expected) return false;
  const authorization = request.headers.get("authorization");
  const supplied = authorization?.startsWith("Bearer ") ? authorization.slice(7) : request.headers.get("x-cron-secret") || "";
  const first = Buffer.from(supplied); const second = Buffer.from(expected);
  return first.length === second.length && timingSafeEqual(first, second);
}

export async function POST(request: Request) {
  try {
    if (!authorized(request)) return Response.json({ success: false, message: "Unauthorized cron request." }, { status: 401 });
    await connectToDatabase();
    const scheduled = await enqueueDueScheduledReports(200);
    const worker = await runReportJobWorker(25);
    return successResponse({ scheduled, worker });
  } catch (error) { return handleApiError(error); }
}
