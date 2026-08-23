import { redirect } from "next/navigation";
import { createAdminMetadata } from "@/lib/admin/metadata";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { AdminModifierGroupsClient } from "@/components/admin/menu/AdminModifierGroupsClient";
export const metadata = createAdminMetadata("Menu Add-ons", "Manage reusable menu customisation groups and prices.");
export const dynamic = "force-dynamic";
export default async function Page(){const user=await getAuthenticatedUser();if(!user)redirect("/admin/login?redirect=/admin/menu/modifier-groups");if(!user.permissions.includes("menu.read"))redirect("/admin/dashboard?error=unauthorized");return <AdminModifierGroupsClient canCreate={user.permissions.includes("menu.create")} canUpdate={user.permissions.includes("menu.update")} canDelete={user.permissions.includes("menu.delete")}/>}
