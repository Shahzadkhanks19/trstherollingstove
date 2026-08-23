import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { InventoryAutomationJob } from "@/models/InventoryAutomationJob";
import { inventoryAutomationHistoryQuerySchema } from "@/validators/inventory-automation";

export async function GET(request: Request) {
  try {
    await requirePermission("inventory.read");
    await connectToDatabase();

    const url = new URL(request.url);
    const parsed =
      inventoryAutomationHistoryQuerySchema.parse(
        Object.fromEntries(url.searchParams),
      );

    const filter: Record<string, unknown> = {};
    if (parsed.status) filter.status = parsed.status;
    if (parsed.jobType) filter.jobType = parsed.jobType;

    const skip = (parsed.page - 1) * parsed.limit;

    const [jobs, total] = await Promise.all([
      InventoryAutomationJob.find(filter)
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsed.limit)
        .lean(),
      InventoryAutomationJob.countDocuments(filter),
    ]);

    return successResponse({
      jobs,
      pagination: {
        page: parsed.page,
        limit: parsed.limit,
        total,
        pages: Math.ceil(total / parsed.limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
