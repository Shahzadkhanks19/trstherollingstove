import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { CustomerProfile } from "@/models/CustomerProfile";
import { User } from "@/models/User";
import { getCustomerRoleId } from "@/services/userManagement.service";
import { getPagination } from "@/utils/pagination";

export async function GET(request: Request) {
  try {
    await requirePermission("users.read"); await connectToDatabase();
    const url = new URL(request.url); const { page, limit, skip } = getPagination(url.searchParams);
    const roleId = await getCustomerRoleId(); const search = url.searchParams.get("search")?.trim();
    const filter: Record<string, unknown> = {
  roleId,
};
    if (search) filter.$or = [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }, { phone: { $regex: search, $options: "i" } }];
    const active = url.searchParams.get("isActive"); if (active === "true" || active === "false") filter.isActive = active === "true";
    const [users, total] = await Promise.all([
      User.find(filter).select("name email phone avatarUrl isActive emailVerifiedAt lastLoginAt createdAt").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ]);
    const profiles = await CustomerProfile.find({ userId: { $in: users.map(u => u._id) } }).lean();
    const map = new Map(profiles.map(p => [String(p.userId), p]));
    return successResponse(users.map(user => ({ user, profile: map.get(String(user._id)) ?? null })), "Customers loaded.", 200, { page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (error) { return handleApiError(error); }
}
