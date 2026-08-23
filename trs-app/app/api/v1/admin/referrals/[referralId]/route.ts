import { Types } from "mongoose";

import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { Referral } from "@/models/Referral";
import { writeAuditLog } from "@/services/audit.service";
import { adjustCoins } from "@/services/rewards.service";
import { referralUpdateSchema } from "@/validators/growth";

type Context = { params: Promise<{ referralId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requirePermission("users.update");
    const { referralId } = await context.params;
    const input = await (async () => {
      const body = await request.json();
      return referralUpdateSchema.parse(body);
    })();
    await connectToDatabase();

    if (!Types.ObjectId.isValid(referralId)) throw new AppError("Invalid referral identifier.", 400);
    const referral = await Referral.findById(referralId);
    if (!referral) throw new AppError("Referral not found.", 404);

    const terminalStatuses = new Set(["rewarded", "rejected", "expired"]);
    if (terminalStatuses.has(referral.status) && input.status !== referral.status) {
      throw new AppError(`A ${referral.status} referral cannot be moved to another status.`, 409);
    }

    if (input.status === "rewarded") {
      if (referral.rewardedAt) return successResponse(referral, "Referral was already rewarded.");
      if (!referral.firstOrderId && referral.status !== "order_completed") {
        throw new AppError("Complete and verify the referred customer’s first order before rewarding.", 409);
      }

      referral.status = "rewarded";
      referral.rewardedAt = new Date();
      referral.rejectionReason = "";
      await referral.save();

      try {
        if (referral.referrerRewardCoins > 0) {
          await adjustCoins({
            customerId: String(referral.referrerCustomerId),
            amount: referral.referrerRewardCoins,
            description: `Referral reward for code ${referral.referralCode}.`,
            actorId: actor.id,
          });
        }
      } catch (error) {
        referral.status = "under_review";
        referral.rewardedAt = null;
        await referral.save();
        throw error;
      }
    } else {
      referral.status = input.status;
      referral.rejectionReason = input.status === "rejected" ? input.rejectionReason : "";
      await referral.save();
    }

    await writeAuditLog({
      actorUserId: actor.id,
      action: "referral.updated",
      entityType: "referral",
      entityId: referral.id,
      description: `Referral ${referral.referralCode} updated to ${input.status}.`,
    });

    return successResponse(referral, "Referral updated.");
  } catch (error) {
    return handleApiError(error);
  }
}
