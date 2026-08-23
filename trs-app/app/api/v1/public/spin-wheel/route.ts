import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { SpinWheelCampaign } from "@/models/SpinWheelCampaign";

export async function GET() {
  try {
    await connectToDatabase();
    const now = new Date();
    const campaign = await SpinWheelCampaign.findOne({ deletedAt: null, isActive: true, startsAt: { $lte: now }, expiresAt: { $gte: now } }).lean();
    if (!campaign) return successResponse({ campaign: null }, "No active spin campaign.");
    return successResponse({
      campaign: {
        id: String(campaign._id),
        name: campaign.name,
        description: campaign.description,
        prizes: campaign.prizes.filter((prize) => prize.isActive).map((prize) => ({ id: String(prize._id), label: prize.label })),
      },
    }, "Spin campaign loaded.");
  } catch (error) {
    return handleApiError(error);
  }
}
