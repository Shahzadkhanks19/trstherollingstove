import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { InternalConsumptionRecordsClient } from "@/components/admin/internal-consumption/InternalConsumptionRecordsClient";
export default async function Page(){const user=await getAuthenticatedUser();if(!user)redirect("/admin/login?redirect=/admin/internal-consumption-records");if(!user.permissions.includes("reports.read"))redirect("/admin/dashboard");return <InternalConsumptionRecordsClient/>;}
