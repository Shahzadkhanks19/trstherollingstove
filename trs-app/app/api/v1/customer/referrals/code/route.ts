import { requireAuthenticatedUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { generateUniqueReferralCode } from "@/lib/referrals/referralCode";
import { CustomerProfile } from "@/models/CustomerProfile";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();

    if (user.roleKey !== "customer") {
      throw new AppError("Customer access required.", 403);
    }

    await connectToDatabase();

    let profile = await CustomerProfile.findOne({ userId: user.id });

    if (!profile) {
      profile = await CustomerProfile.create({
        userId: user.id,
        referralCode: await generateUniqueReferralCode(user.name),
      });
    } else if (!profile.referralCode) {
      profile.referralCode = await generateUniqueReferralCode(user.name);
      await profile.save();
    }

    const referralCode = profile.referralCode;
    if (!referralCode) {
      throw new AppError("Unable to generate referral code.", 500);
    }

    const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

    return successResponse(
      {
        referralCode,
        referralLink: `${appUrl}/signup?ref=${encodeURIComponent(referralCode)}`,
      },
      "Referral code loaded.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
