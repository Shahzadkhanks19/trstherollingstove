import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { writeAuditLog } from "@/services/audit.service";
import { adjustCoins } from "@/services/rewards.service";
import { coinAdjustmentSchema } from "@/validators/rewards";

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("orders.manage");
    const input = await validateRequestBody(request, coinAdjustmentSchema);
    await connectToDatabase();

    const result = await adjustCoins({
      ...input,
      actorId: actor.id,
    });

    await writeAuditLog({
      actorUserId: actor.id,
      action: "rewards.adjusted",
      entityType: "coin_wallet",
      entityId: result.wallet.id,
      description: input.description,
      metadata: {
        customerId: input.customerId,
        amount: input.amount,
      },
    });

    return successResponse(result, "TRS Coins adjusted.");
  } catch (error) {
    return handleApiError(error);
  }
}
