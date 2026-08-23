import { createAdminMetadata } from "@/lib/admin/metadata";
import { redirect } from "next/navigation";
import { AdminSettingsClient } from "@/components/admin/administration/AdminSettingsClient";
import { getAuthenticatedUser } from "@/lib/auth/session";
export const metadata = createAdminMetadata("Settings", "Configure business, ordering, payment, notification and integration settings.");

export const dynamic = "force-dynamic";
export default async function SettingsPage(){const user=await getAuthenticatedUser();if(!user)redirect("/admin/login?redirect=/admin/settings");if(!user.permissions.includes("settings.manage"))redirect("/admin/dashboard?error=unauthorized");return <AdminSettingsClient/>}
