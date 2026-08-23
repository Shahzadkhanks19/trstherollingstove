/**
 * Optional integration example.
 *
 * Call this from the public ordering APIs before accepting a new
 * order. Do not block admin, health-check or payment-webhook routes.
 */

import { AppError } from "@/lib/errors/AppError";
import { getRuntimeSetting } from "@/lib/settings/runtime";

export async function assertOrderingAvailable() {
  const operations =
    await getRuntimeSetting("operations");
  const ordering =
    await getRuntimeSetting("ordering");

  if (operations.maintenanceMode === true) {
    throw new AppError(
      String(
        operations.maintenanceMessage ??
          "The service is temporarily unavailable.",
      ),
      503,
    );
  }

  if (ordering.orderingEnabled !== true) {
    throw new AppError(
      "Online ordering is currently closed.",
      503,
    );
  }
}
