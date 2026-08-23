import { redirect } from "next/navigation";
import { SupplierIntelligenceDashboardClient } from "@/components/admin/purchasing/SupplierIntelligenceDashboardClient";
import { createAdminMetadata } from "@/lib/admin/metadata";
import { getAuthenticatedUser } from "@/lib/auth/session";
export const metadata=createAdminMetadata("Supplier Intelligence","Supplier scorecards, rankings, spend, quality, delivery and pricing intelligence.");
export const dynamic="force-dynamic";
export default async function SupplierIntelligencePage(){const user=await getAuthenticatedUser();if(!user)redirect("/admin/login?redirect=/admin/supplier-intelligence");if(!user.permissions.includes("purchases.read"))redirect("/admin/login?error=unauthorized");return <SupplierIntelligenceDashboardClient canManage={user.permissions.includes("purchases.manage")} canExport={user.permissions.includes("reports.read")}/>;}
