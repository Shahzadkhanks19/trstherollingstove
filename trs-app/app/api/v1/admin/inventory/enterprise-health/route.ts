import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { InventoryAlertEvent } from "@/models/InventoryAlertEvent";
import { InventoryAutomationJob } from "@/models/InventoryAutomationJob";
import { InventoryReportCache } from "@/models/InventoryReportCache";

export async function GET() {
  try {
    await requirePermission("inventory.read");
    await connectToDatabase();

    const now = new Date();
    const [
      openAlerts,
      failedJobs,
      queuedJobs,
      cacheEntries,
      expiredCacheEntries,
    ] = await Promise.all([
      InventoryAlertEvent.countDocuments({
        status: "open",
      }),
      InventoryAutomationJob.countDocuments({
        status: "failed",
      }),
      InventoryAutomationJob.countDocuments({
        status: { $in: ["queued", "running"] },
      }),
      InventoryReportCache.countDocuments({
        expiresAt: { $gt: now },
      }),
      InventoryReportCache.countDocuments({
        expiresAt: { $lte: now },
      }),
    ]);

    return successResponse({
      status: failedJobs > 0 ? "degraded" : "healthy",
      checks: {
        database: "connected",
        realtimeConfigured: Boolean(
          process.env.REALTIME_SERVER_URL &&
            process.env.REALTIME_INTERNAL_SECRET,
        ),
        cronConfigured: Boolean(process.env.CRON_SECRET),
      },
      inventory: {
        openAlerts,
        failedJobs,
        queuedJobs,
        cacheEntries,
        expiredCacheEntries,
      },
      checkedAt: now,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
