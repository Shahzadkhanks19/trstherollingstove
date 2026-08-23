import { randomInt } from "node:crypto";
import { Types } from "mongoose";

import { requireAuthenticatedUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { Coupon } from "@/models/Coupon";
import { SpinWheelCampaign } from "@/models/SpinWheelCampaign";
import { SpinWheelSpin } from "@/models/SpinWheelSpin";
import { adjustCoins } from "@/services/rewards.service";
import { sendNotification } from "@/services/notification.service";

function indiaDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

async function getActiveCampaign() {
  const now = new Date();
  return SpinWheelCampaign.findOne({
    deletedAt: null,
    isActive: true,
    startsAt: { $lte: now },
    expiresAt: { $gte: now },
  }).lean();
}

export async function GET() {
  try {
    const actor = await requireAuthenticatedUser();
    if (actor.roleKey !== "customer") throw new AppError("Customer access required.", 403);
    await connectToDatabase();

    const campaign = await getActiveCampaign();
    if (!campaign) return successResponse({ campaign: null, remainingSpins: 0 }, "No active spin campaign.");

    const used = await SpinWheelSpin.countDocuments({
      campaignId: campaign._id,
      customerId: actor.id,
      spinDateKey: indiaDateKey(),
    });

    return successResponse({
      campaign: {
        id: String(campaign._id),
        name: campaign.name,
        description: campaign.description,
        prizes: campaign.prizes.filter((prize) => prize.isActive).map((prize) => ({ id: String(prize._id), label: prize.label })),
      },
      remainingSpins: Math.max(0, campaign.dailySpinLimit - used),
    }, "Spin campaign loaded.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST() {
  try {
    const actor = await requireAuthenticatedUser();
    if (actor.roleKey !== "customer") throw new AppError("Customer access required.", 403);
    await connectToDatabase();

    const campaign = await getActiveCampaign();
    if (!campaign) throw new AppError("No active spin campaign is available.", 404);

    const dateKey = indiaDateKey();
    const used = await SpinWheelSpin.countDocuments({ campaignId: campaign._id, customerId: actor.id, spinDateKey: dateKey });
    if (used >= campaign.dailySpinLimit) throw new AppError("You have used today’s spin limit.", 429);

    const prizes = campaign.prizes.filter((prize) => prize.isActive && prize.weight > 0);
    if (prizes.length === 0) throw new AppError("This campaign has no available prizes.", 409);

    const totalWeight = prizes.reduce((sum, prize) => sum + prize.weight, 0);
    let cursor = randomInt(totalWeight);
    const selected = prizes.find((prize) => {
      cursor -= prize.weight;
      return cursor < 0;
    }) ?? prizes[prizes.length - 1];

    if (selected.type === "coupon") {
      const coupon = await Coupon.findOne({ code: selected.couponCode, couponChannel: "spin_wheel_only", isActive: true, deletedAt: null, startsAt: { $lte: new Date() }, expiresAt: { $gte: new Date() } }).lean();
      if (!coupon) throw new AppError("The selected coupon prize is currently unavailable. Please spin again.", 409);
    }

    if (selected.type === "coins" && selected.value > 0) {
      await adjustCoins({
        customerId: actor.id,
        amount: Math.floor(selected.value),
        description: `Spin wheel prize: ${selected.label}`,
        actorId: actor.id,
      });
    }

    const rewardGranted = selected.type !== "try_again";
    const spin = await SpinWheelSpin.create({
      campaignId: campaign._id,
      customerId: new Types.ObjectId(actor.id),
      prizeId: selected._id,
      prizeLabel: selected.label,
      prizeType: selected.type,
      prizeValue: selected.value,
      couponCode: selected.couponCode,
      spinDateKey: dateKey,
      rewardStatus: rewardGranted ? "granted" : "not_applicable",
      ...(rewardGranted ? { rewardGrantedAt: new Date() } : {}),
    });

    const spinId = String(spin._id);

    const rewardMessage =
      selected.type === "coins"
        ? `${Math.floor(selected.value)} TRS Coins have been added to your wallet.`
        : selected.type === "coupon"
          ? `Coupon ${selected.couponCode} has been added to your spin rewards. Use it during checkout.`
          : "Better luck next time. Come back for your next available spin.";

    try {
      await sendNotification({
        recipientId: actor.id,
        eventKey: `spin-wheel:${spinId}`,
        category: "rewards",
        type: "reward",
        title: selected.type === "try_again" ? "Spin completed" : "Spin reward granted",
        message: `${selected.label}. ${rewardMessage}`,
        actionUrl: selected.type === "coupon" ? "/menu" : "/rewards",
        metadata: {
          spinId,
          campaignId: String(campaign._id),
          prizeType: selected.type,
          prizeValue: selected.value,
          couponCode: selected.couponCode,
        },
        channels: ["in_app"],
        createdBy: actor.id,
      });
    } catch {
      // Reward delivery must not fail because an optional notification could not be created.
    }

    return successResponse({
      spinId,
      prize: {
        id: String(selected._id),
        label: selected.label,
        type: selected.type,
        value: selected.value,
        couponCode: selected.couponCode,
      },
      rewardGranted,
      rewardMessage,
      remainingSpins: Math.max(0, campaign.dailySpinLimit - used - 1),
    }, "Spin completed and reward processed.");
  } catch (error) {
    return handleApiError(error);
  }
}
