import { AdminPageHeroesClient } from "@/components/admin/content/AdminPageHeroesClient";
import { createAdminMetadata } from "@/lib/admin/metadata";
import { requirePermission } from "@/lib/auth/session";

export const metadata = createAdminMetadata("Page Heroes", "Manage hero images for every public and system page.");

export default async function AdminPageHeroesPage() {
  await requirePermission("cms.read");
  return <AdminPageHeroesClient />;
}
