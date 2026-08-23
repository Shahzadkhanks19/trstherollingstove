import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { ContactMessage } from "@/models/ContactMessage";
import { getPagination } from "@/utils/pagination";

export async function GET(request: Request) {
  try {
    await requirePermission("notifications.read");
    await connectToDatabase();
    const url = new URL(request.url);
    const { page, limit, skip } = getPagination(url.searchParams);
    const search = url.searchParams.get("search")?.trim();
    const status = url.searchParams.get("status")?.trim();
    const filter: Record<string, unknown> = {};
    if (status && status !== "all") filter.status = status;
    if (search) filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { subject: { $regex: search, $options: "i" } },
    ];
    const [items, total, counts] = await Promise.all([
      ContactMessage.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ContactMessage.countDocuments(filter),
      ContactMessage.aggregate<{ _id: string; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);
    const statusCounts = Object.fromEntries(counts.map((entry) => [entry._id, entry.count]));
    statusCounts.all = counts.reduce((sum, entry) => sum + entry.count, 0);
    return successResponse({ items, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) }, statusCounts });
  } catch (error) { return handleApiError(error); }
}
