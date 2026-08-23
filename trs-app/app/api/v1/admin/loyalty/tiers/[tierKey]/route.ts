import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { LoyaltyTier } from "@/models/LoyaltyTier";
import { writeAuditLog } from "@/services/audit.service";
import { loyaltyTierUpdateSchema } from "@/validators/loyalty";

const LOYALTY_TIER_KEYS = ["bronze", "silver", "gold", "platinum"] as const;
type LoyaltyTierKey = (typeof LOYALTY_TIER_KEYS)[number];

function isLoyaltyTierKey(value: string): value is LoyaltyTierKey {
  return LOYALTY_TIER_KEYS.includes(value as LoyaltyTierKey);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tierKey: string }> },
) {
  try {
    const actor = await requirePermission("settings.manage");
    const input = await validateRequestBody(request, loyaltyTierUpdateSchema);
    await connectToDatabase();

    const { tierKey } = await params;
    if (!isLoyaltyTierKey(tierKey)) {
      throw new AppError("Loyalty tier not found.", 404);
    }

    const tier = await LoyaltyTier.findOne({ key: tierKey });
    if (!tier) {
      throw new AppError("Loyalty tier not found.", 404);
    }

    tier.set(input);
    await tier.save();

    await writeAuditLog({
      actorUserId: actor.id,
      action: "loyalty.tier_updated",
      entityType: "loyalty_tier",
      entityId: tier.id,
      description: `Updated ${tier.name} tier.`,
    });

    return successResponse(tier, "Loyalty tier updated.");
  } catch (error) {
    return handleApiError(error);
  }
}
