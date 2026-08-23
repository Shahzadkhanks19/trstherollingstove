import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { Payment } from "@/models/Payment";

export async function GET(request: Request) {
  try {
    await requirePermission("payments.read");
    await connectToDatabase();

    const url = new URL(request.url);
    const page = Math.max(Number(url.searchParams.get("page") ?? 1), 1);
    const limit = Math.min(
      Math.max(Number(url.searchParams.get("limit") ?? 25), 1),
      100,
    );
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search")?.trim();

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { providerOrderId: { $regex: search, $options: "i" } },
        { providerPaymentId: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { contact: { $regex: search, $options: "i" } },
      ];
    }

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate("orderId", "orderNumber grandTotal paymentStatus")
        .populate("customerId", "name email phone")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Payment.countDocuments(filter),
    ]);

    return successResponse(
      {
        payments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      "Payments loaded.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
