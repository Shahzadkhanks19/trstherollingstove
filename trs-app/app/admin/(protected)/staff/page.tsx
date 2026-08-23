import { createAdminMetadata } from "@/lib/admin/metadata";
import { redirect } from "next/navigation";
import { AdminStaffRolesClient } from "@/components/admin/administration/AdminStaffRolesClient";
import { getAuthenticatedUser } from "@/lib/auth/session";
export const metadata = createAdminMetadata("Staff & Roles", "Manage staff accounts, roles and permissions.");

export const dynamic = "force-dynamic";
export default async function StaffPage(){const user=await getAuthenticatedUser();if(!user)redirect("/admin/login?redirect=/admin/staff");if(!user.permissions.includes("users.read")&&!user.permissions.includes("roles.read"))redirect("/admin/dashboard?error=unauthorized");return <AdminStaffRolesClient permissions={user.permissions}/>}
