import { createAdminMetadata } from "@/lib/admin/metadata";
import InternalConsumptionConfigurationClient from "@/components/admin/internal-consumption/InternalConsumptionConfigurationClient";

export const metadata = createAdminMetadata("Internal Consumption Configuration", "Manage departments, designations, meal categories, policies and controls.");
export default function Page() { return <InternalConsumptionConfigurationClient />; }
