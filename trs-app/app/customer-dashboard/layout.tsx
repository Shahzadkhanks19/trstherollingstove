import { redirect } from "next/navigation";
import { CustomerDashboardShell } from "@/components/customer-dashboard/CustomerDashboardShell";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { getPublicOrderingAvailability } from "@/lib/public-ordering";

export const dynamic = "force-dynamic";

export default async function CustomerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const availability =
    await getPublicOrderingAvailability();

  if (!availability.enabled) {
    redirect("/ordering-coming-soon");
  }

  const user = await getAuthenticatedUser();
  if (!user) redirect("/login?next=/customer-dashboard");
  if (user.roleKey !== "customer") redirect("/admin");

  return (
    <CustomerDashboardShell customerName={user.name}>
      {children}
    </CustomerDashboardShell>
  );
}
