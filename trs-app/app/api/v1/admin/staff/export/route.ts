import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { Role } from "@/models/Role";
import { StaffProfile } from "@/models/StaffProfile";
import { User } from "@/models/User";
import { buildCsv } from "@/utils/csv";
export async function GET() {
  try {
    await requirePermission("users.read");
    await connectToDatabase();
    const customerRole = await Role.findOne({ key: "customer" })
      .select("_id")
      .lean();
    const users = await User.find({ roleId: { $ne: customerRole?._id } })
      .populate("roleId", "name")
      .select("name email phone roleId isActive lastLoginAt")
      .limit(10000)
      .lean();
    const profiles = await StaffProfile.find({
      userId: { $in: users.map((u) => u._id) },
    }).lean();
    const map = new Map(profiles.map((p) => [String(p.userId), p]));
    const csv = buildCsv(
      [
        "Employee Code",
        "Name",
        "Email",
        "Phone",
        "Role",
        "Department",
        "Designation",
        "Employment Type",
        "Status",
        "Last Login",
      ],
      users.map((u) => {
        const p = map.get(String(u._id));
        const role = u.roleId as unknown as {
  name?: string;
};
        return [
          p?.employeeCode ?? "",
          u.name,
          u.email,
          u.phone ?? "",
          role?.name ?? "",
          p?.department ?? "",
          p?.designation ?? "",
          p?.employmentType ?? "",
          u.isActive ? "Active" : "Inactive",
          u.lastLoginAt?.toISOString() ?? "",
        ];
      }),
    );
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="trs-staff-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
