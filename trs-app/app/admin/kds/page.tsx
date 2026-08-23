import { createAdminMetadata } from "@/lib/admin/metadata";
import { redirect } from "next/navigation";

import { KitchenDisplayClient } from "@/components/admin/kds/KitchenDisplayClient";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const metadata = createAdminMetadata("Kitchen Display", "Run the real-time kitchen production queue.");

export const dynamic = "force-dynamic";

export default async function AdminKdsPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/admin/login?redirect=/admin/kds");
  }

  if (!user.permissions.includes("kds.use")) {
    redirect("/admin/dashboard?error=unauthorized");
  }

  return <KitchenDisplayClient userName={user.name} />;
}
