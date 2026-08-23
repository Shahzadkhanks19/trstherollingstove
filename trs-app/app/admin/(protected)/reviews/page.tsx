import { createAdminMetadata } from "@/lib/admin/metadata";
import { redirect } from "next/navigation";
import { AdminReviewsClient } from "@/components/admin/reviews/AdminReviewsClient";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const metadata = createAdminMetadata("Reviews", "Moderate customer reviews and publish owner responses.");

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/admin/login?redirect=/admin/reviews");
  if (!user.permissions.includes("reviews.read")) redirect("/admin/dashboard?error=unauthorized");
  return <AdminReviewsClient canManage={user.permissions.includes("reviews.manage")} />;
}
