import { redirect } from "next/navigation";
import { InternalConsumptionFinancialsClient } from "@/components/admin/internal-consumption/InternalConsumptionFinancialsClient";
import { getAuthenticatedUser } from "@/lib/auth/session";

export default async function InternalConsumptionFinancialsPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/admin/login?redirect=/admin/internal-consumption-financials");
  if (!user.permissions.includes("reports.read")) redirect("/admin/dashboard");
  return <InternalConsumptionFinancialsClient />;
}
