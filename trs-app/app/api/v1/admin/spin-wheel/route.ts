import { Types } from "mongoose";

import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { Coupon } from "@/models/Coupon";
import { SpinWheelCampaign } from "@/models/SpinWheelCampaign";
import { writeAuditLog } from "@/services/audit.service";
import {
  spinWheelActivationSchema,
  spinWheelCampaignSchema,
  spinWheelCampaignUpdateSchema,
  spinWheelDeletionSchema,
} from "@/validators/growth";

async function validateCouponPrizes(prizes: Array<{ type: "coins" | "coupon" | "try_again"; couponCode: string; isActive: boolean }>) {
  const couponCodes = [
    ...new Set(
      prizes
        .filter((prize) => prize.type === "coupon" && prize.isActive)
        .map((prize) => prize.couponCode),
    ),
  ];

  if (!couponCodes.length) return;

  const validCoupons = await Coupon.countDocuments({
    code: { $in: couponCodes },
    isActive: true,
    deletedAt: null,
    couponChannel: "spin_wheel_only",
    expiresAt: { $gte: new Date() },
  });

  if (validCoupons !== couponCodes.length) {
    throw new AppError(
      "Every active coupon prize must reference a current active Spin Wheel Only coupon.",
      400,
    );
  }
}

export async function GET() {
  try {
    await requirePermission("settings.manage");
    await connectToDatabase();
    const campaigns = await SpinWheelCampaign.find({ deletedAt: null }).sort({ createdAt: -1 }).lean();
    return successResponse(campaigns, "Spin wheel campaigns loaded.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("settings.manage");
    const input = await validateRequestBody(request, spinWheelCampaignSchema);
    await connectToDatabase();

    await validateCouponPrizes(input.prizes);

    if (input.isActive) await SpinWheelCampaign.updateMany({ deletedAt: null }, { $set: { isActive: false } });
    const campaign = await SpinWheelCampaign.create({
      ...input,
      startsAt: new Date(input.startsAt),
      expiresAt: new Date(input.expiresAt),
      createdBy: new Types.ObjectId(actor.id),
      updatedBy: new Types.ObjectId(actor.id),
    });

    await writeAuditLog({ actorUserId: actor.id, action: "spin_campaign.created", entityType: "spin_campaign", entityId: campaign.id, description: `Spin campaign ${campaign.name} created.` });
    return successResponse(campaign, "Spin wheel campaign created.", 201);
  } catch (error) {
    return handleApiError(error);
  }
}


export async function PUT(request: Request) {
  try {
    const actor = await requirePermission("settings.manage");
    const input = await validateRequestBody(request, spinWheelCampaignUpdateSchema);
    await connectToDatabase();
    await validateCouponPrizes(input.prizes);

    const campaign = await SpinWheelCampaign.findOne({
      _id: input.id,
      deletedAt: null,
    });
    if (!campaign) throw new AppError("Spin wheel campaign not found.", 404);

    if (input.isActive) {
      await SpinWheelCampaign.updateMany(
        { _id: { $ne: campaign._id }, deletedAt: null },
        { $set: { isActive: false } },
      );
    }

    campaign.set({
      name: input.name,
      description: input.description,
      dailySpinLimit: input.dailySpinLimit,
      startsAt: new Date(input.startsAt),
      expiresAt: new Date(input.expiresAt),
      prizes: input.prizes,
      isActive: input.isActive,
      updatedBy: new Types.ObjectId(actor.id),
    });
    await campaign.save();

    await writeAuditLog({
      actorUserId: actor.id,
      action: "spin_campaign.updated",
      entityType: "spin_campaign",
      entityId: campaign.id,
      description: `Spin campaign ${campaign.name} edited.`,
    });

    return successResponse(campaign, "Spin wheel campaign updated.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requirePermission("settings.manage");
    const input = await validateRequestBody(request, spinWheelActivationSchema);
    await connectToDatabase();

    const campaign = await SpinWheelCampaign.findOne({ _id: input.id, deletedAt: null });
    if (!campaign) throw new AppError("Spin wheel campaign not found.", 404);
    const now = new Date();
    if (input.isActive && campaign.expiresAt < now) {
      throw new AppError("This campaign has expired. Edit its schedule before activating it again.", 409);
    }

    if (input.isActive) await SpinWheelCampaign.updateMany({ _id: { $ne: campaign._id }, deletedAt: null }, { $set: { isActive: false } });
    campaign.isActive = input.isActive;
    campaign.updatedBy = new Types.ObjectId(actor.id);
    await campaign.save();

    await writeAuditLog({ actorUserId: actor.id, action: "spin_campaign.updated", entityType: "spin_campaign", entityId: campaign.id, description: `Spin campaign ${campaign.name} ${input.isActive ? "activated" : "deactivated"}.` });
    return successResponse(campaign, "Spin wheel campaign updated.");
  } catch (error) {
    return handleApiError(error);
  }
}


export async function DELETE(request: Request) {
  try {
    const actor = await requirePermission("settings.manage");
    const input = await validateRequestBody(request, spinWheelDeletionSchema);
    await connectToDatabase();

    const campaign = await SpinWheelCampaign.findOne({
      _id: input.id,
      deletedAt: null,
    });
    if (!campaign) throw new AppError("Spin wheel campaign not found.", 404);

    campaign.isActive = false;
    campaign.deletedAt = new Date();
    campaign.updatedBy = new Types.ObjectId(actor.id);
    await campaign.save();

    await writeAuditLog({
      actorUserId: actor.id,
      action: "spin_campaign.deleted",
      entityType: "spin_campaign",
      entityId: campaign.id,
      description: `Spin campaign ${campaign.name} deleted.`,
    });

    return successResponse(null, "Spin wheel campaign deleted.");
  } catch (error) {
    return handleApiError(error);
  }
}
