import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { InternalConsumptionMember } from "@/models/InternalConsumptionMember";
import { InternalConsumptionReason } from "@/models/InternalConsumptionReason";
import { Role } from "@/models/Role";
import { StaffProfile } from "@/models/StaffProfile";
import { User } from "@/models/User";

export async function GET() {
  try {
    await requirePermission("pos.use");
    await connectToDatabase();
    const customerRole = await Role.findOne({ key: "customer" }).select("_id").lean();
    const users = await User.find({ isActive: true, ...(customerRole?._id ? { roleId: { $ne: customerRole._id } } : {}) }).select("name").sort({ name: 1 }).lean();
    const [profiles, family, reasons] = await Promise.all([
      StaffProfile.find({ userId: { $in: users.map((user) => user._id) }, mealEligible: { $ne: false } }).select("userId employeeCode department designation dailyMealLimit monthlyMealLimit requireManagerApprovalOnLimit").lean(),
      InternalConsumptionMember.find({ type: "family", isActive: true, deletedAt: null }).select("name relationship phone").sort({ name: 1 }).lean(),
      InternalConsumptionReason.find({ isActive: true, deletedAt: null }).select("saleType name sortOrder").sort({ saleType: 1, sortOrder: 1, name: 1 }).lean(),
    ]);
    const profileByUser = new Map(profiles.map((profile) => [String(profile.userId), profile]));
    return successResponse({
      staff: users.flatMap((user) => {
        const profile = profileByUser.get(String(user._id));
        return profile ? [{ id: String(user._id), name: user.name, employeeCode: profile.employeeCode ?? "", department: profile.department ?? "other", designation: profile.designation ?? "", dailyMealLimit: profile.dailyMealLimit ?? 2, monthlyMealLimit: profile.monthlyMealLimit ?? 60, requireManagerApprovalOnLimit: profile.requireManagerApprovalOnLimit ?? true }] : [];
      }),
      family: family.map((member) => ({ id: String(member._id), name: member.name, relationship: member.relationship ?? "", phone: member.phone ?? "" })),
      reasons: reasons.reduce<Record<string, Array<{ id: string; name: string }>>>((accumulator, reason) => {
        (accumulator[reason.saleType] ??= []).push({ id: String(reason._id), name: reason.name });
        return accumulator;
      }, {}),
    }, "Internal consumption options loaded.");
  } catch (error) { return handleApiError(error); }
}
