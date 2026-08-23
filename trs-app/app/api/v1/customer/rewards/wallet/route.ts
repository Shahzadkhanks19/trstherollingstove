import { requireAuthenticatedUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { CoinTransaction } from "@/models/CoinTransaction";
import { getOrCreateWallet } from "@/services/rewards.service";

export async function GET(request: Request) {
  try {
    const actor = await requireAuthenticatedUser();
    if (actor.roleKey !== "customer") throw new AppError("Customer access required.", 403);
    await connectToDatabase();

    const url = new URL(request.url);
    const page = Math.max(Number(url.searchParams.get("page") ?? 1), 1);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 20), 1), 100);

    const wallet = await getOrCreateWallet(actor.id);
    const [transactions, total] = await Promise.all([
      CoinTransaction.find({ customerId: actor.id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      CoinTransaction.countDocuments({ customerId: actor.id }),
    ]);

    return successResponse(
      {
        wallet,
        transactions,
        rules: {
          earnRate: "5 coins per ₹100",
          coinValue: "1 coin = ₹1",
        },
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      "Rewards wallet loaded.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
