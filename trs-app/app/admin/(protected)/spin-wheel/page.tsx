import { createAdminMetadata } from "@/lib/admin/metadata";
import { AdminSpinWheelClient } from "@/components/admin/growth/AdminSpinWheelClient";
export const metadata = createAdminMetadata("Spin Wheel", "Configure spin-wheel campaigns, prizes and limits.");

export const dynamic = "force-dynamic";
export default function SpinWheelPage(){ return <AdminSpinWheelClient/>; }
