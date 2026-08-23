import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { PrintJob } from "@/models/PrintJob";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    await requirePermission("pos.use");
    await connectToDatabase();
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? "all";
    const query = url.searchParams.get("q")?.trim() ?? "";
    const filter: Record<string, unknown> = {};
    if (["requested", "opened", "printed", "failed"].includes(status)) filter.status = status;
    if (query) filter.$or = [
      { orderNumber: { $regex: query, $options: "i" } },
      { label: { $regex: query, $options: "i" } },
    ];
    const rows = await PrintJob.find(filter).populate("requestedBy", "name email").sort({ requestedAt: -1 }).limit(300).lean();
    return successResponse(rows.map((row) => ({ ...row, _id: String(row._id), entityId: String(row.entityId), orderId: row.orderId ? String(row.orderId) : null })));
  } catch (error) { return handleApiError(error); }
}
