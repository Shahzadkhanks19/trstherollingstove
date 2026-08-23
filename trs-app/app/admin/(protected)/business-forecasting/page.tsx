import { redirect } from "next/navigation";
import { BusinessForecastClient } from "@/components/admin/forecasting/BusinessForecastClient";
import { createAdminMetadata } from "@/lib/admin/metadata";
import { getAuthenticatedUser } from "@/lib/auth/session";
export const metadata=createAdminMetadata("Business Forecasting","Revenue, order, food-cost and internal-consumption projections.");
export const dynamic="force-dynamic";
export default async function BusinessForecastingPage(){const user=await getAuthenticatedUser();if(!user)redirect("/admin/login?redirect=/admin/business-forecasting");if(!user.permissions.includes("reports.read"))redirect("/admin/login?error=unauthorized");return <BusinessForecastClient/>;}
