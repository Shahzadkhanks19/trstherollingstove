import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { createAndRunInventoryJob } from "@/services/inventory-automation.service";

function assertCronSecret(request: Request) {
  const expected = process.env.CRON_SECRET;
  const received = request.headers.get("authorization");

  if (!expected || received !== `Bearer ${expected}`) {
    throw new AppError("Unauthorized cron request.", 401);
  }
}

export async function GET(request: Request) {
  try {
    assertCronSecret(request);
    await connectToDatabase();

    const job = await createAndRunInventoryJob({
      jobType: "alert_scan",
      source: "cron",
      scheduleKey: "inventory-alert-scan",
    });

    return successResponse(job);
  } catch (error) {
    return handleApiError(error);
  }
}
