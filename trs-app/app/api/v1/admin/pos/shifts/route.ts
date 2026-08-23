import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { POSShift } from "@/models/POSShift";

export async function GET(request: Request) {
  try {
    await requirePermission("pos.manage");
    await connectToDatabase();

    const url = new URL(request.url);
    const page = Math.max(
      Number(url.searchParams.get("page") ?? 1),
      1,
    );
    const limit = Math.min(
      Math.max(
        Number(url.searchParams.get("limit") ?? 25),
        1,
      ),
      100,
    );
    const status = url.searchParams.get("status");

    const filter: Record<string, unknown> = {};
    if (status === "open" || status === "closed") {
      filter.status = status;
    }

    const [shifts, total] = await Promise.all([
      POSShift.find(filter)
        .populate("registerId", "name code")
        .populate("openedBy", "name email")
        .populate("closedBy", "name email")
        .sort({ openedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      POSShift.countDocuments(filter),
    ]);

    return successResponse({
      shifts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
