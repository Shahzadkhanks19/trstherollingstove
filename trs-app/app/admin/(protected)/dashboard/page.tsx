import { createAdminMetadata } from "@/lib/admin/metadata";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faBoxesStacked, faCoins, faIndianRupeeSign, faReceipt, faTriangleExclamation, faUserPlus, faUtensils } from "@fortawesome/free-solid-svg-icons";
import { connectToDatabase } from "@/lib/db/mongoose";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { resolveDashboardDateRange } from "@/lib/dashboard/dateRange";
import { getDashboardComparison, getOrderStatusBreakdown, getTopProducts } from "@/services/dashboardAnalytics.service";
import { PageHeader, SectionCard, StatCard, StatusBadge } from "@/components/admin/AdminPrimitives";
import { AdminRealtimePageRefresh } from "@/components/admin/AdminRealtimePageRefresh";
import { SalesOverviewClient } from "@/components/admin/analytics/SalesOverviewClient";
import { DashboardWidgetPreferences } from "@/components/admin/dashboard/DashboardWidgetPreferences";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const metadata = createAdminMetadata("Dashboard", "Monitor current orders, revenue, customers, inventory and operational performance.");

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/admin/login?redirect=/admin/dashboard");
  if (!user.permissions.includes("reports.read")) {
    redirect("/admin/login?error=unauthorized");
  }

  await connectToDatabase();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  const range = resolveDashboardDateRange(today, today);
  const [comparison, statuses, products] = await Promise.all([
    getDashboardComparison(range), getOrderStatusBreakdown(range), getTopProducts(range, 6),
  ]);
  const current = comparison.current;
  const maxProductRevenue = Math.max(...products.map(item => item.revenue), 1);
  const statusTotal = statuses.reduce((sum, item) => sum + item.count, 0) || 1;
  return <>
    <AdminRealtimePageRefresh events={["dashboard.metrics_updated", "order.created", "order.status_changed", "payment.updated", "inventory.stock_changed", "enquiry.created", "review.created"]} />
    <PageHeader eyebrow="Executive overview" title="Good day, Admin" description="Live business performance, order flow and operational priorities across The Rolling Stove." action={<div className="flex flex-wrap gap-2"><DashboardWidgetPreferences/><Link href="/admin/orders" className="rounded-xl border border-[#dacec4] bg-white px-4 py-3 text-[10px] font-black uppercase tracking-wider">View Orders</Link><Link href="/admin/menu" className="rounded-xl bg-[#C8102E] px-4 py-3 text-[10px] font-black uppercase tracking-wider text-white shadow-[0_10px_24px_rgba(200,16,46,.22)]">Manage Menu</Link></div>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Today's Revenue" value={money.format(current.revenue)} icon={faIndianRupeeSign} change={comparison.change.revenue} detail="Compared with previous period" />
      <StatCard label="Orders Today" value={String(current.orders)} icon={faReceipt} change={comparison.change.orders} detail={`${current.pendingOrders} currently active`} />
      <StatCard label="Average Order" value={money.format(current.averageOrderValue)} icon={faUtensils} change={comparison.change.averageOrderValue} detail="Average transaction value" />
      <StatCard label="New Customers" value={String(current.customers)} icon={faUserPlus} change={comparison.change.customers} detail="New accounts in this period" />
    </div>
    <div data-dashboard-widget="sales"><SalesOverviewClient /></div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
      <div data-dashboard-widget="top-items"><SectionCard title="Top-selling items" subtitle="Today's strongest menu performers" href="/admin/reports/menu-performance">
        {products.length ? <div className="space-y-5">{products.map((item, index) => <div key={`${item.itemId}-${index}`}><div className="mb-2 flex items-end justify-between gap-4"><div><p className="text-sm font-extrabold text-[#183043]">{item.name}</p><p className="mt-1 text-[10px] font-bold text-[#8d8178]">{item.quantity} sold</p></div><p className="text-xs font-black text-[#C8102E]">{money.format(item.revenue)}</p></div><div className="h-2 overflow-hidden rounded-full bg-[#f0e8e1]"><div className="h-full rounded-full bg-gradient-to-r from-[#C8102E] to-[#E8A53A]" style={{ width: `${Math.max(8, (item.revenue/maxProductRevenue)*100)}%` }}/></div></div>)}</div> : <p className="py-12 text-center text-sm font-semibold text-[#8c8178]">No completed sales recorded today.</p>}
      </SectionCard></div>
      <div data-dashboard-widget="pipeline"><SectionCard title="Order pipeline" subtitle="Live distribution by status" href="/admin/orders/live">
        <div className="space-y-4">{statuses.length ? statuses.map(item => <div key={item.status} className="flex items-center gap-3"><div className="min-w-24"><StatusBadge value={item.status}/></div><div className="h-2 flex-1 overflow-hidden rounded-full bg-[#f0e8e1]"><div className="h-full rounded-full bg-[#17384d]" style={{ width: `${Math.max(4,(item.count/statusTotal)*100)}%` }}/></div><b className="w-8 text-right text-xs text-[#17384d]">{item.count}</b></div>) : <p className="py-10 text-center text-sm font-semibold text-[#8c8178]">No orders in this period.</p>}</div>
      </SectionCard></div>
    </div>
    <div className="mt-5 grid gap-5 lg:grid-cols-3">
      <div data-dashboard-widget="pulse"><SectionCard title="Operational pulse"><div className="grid grid-cols-2 gap-3"><Pulse icon={faReceipt} label="Active orders" value={current.pendingOrders}/><Pulse icon={faUtensils} label="Completed" value={current.completedOrders}/><Pulse icon={faBoxesStacked} label="Stock alerts" value="—"/><Pulse icon={faTriangleExclamation} label="Pending actions" value="—"/></div></SectionCard></div>
      <div data-dashboard-widget="quick"><SectionCard title="Quick actions"><div className="grid gap-2"><Quick href="/admin/menu/items/new" label="Add menu item"/><Quick href="/admin/coupons/new" label="Create coupon"/><Quick href="/admin/inventory" label="Update inventory"/><Quick href="/admin/purchasing/orders/new" label="Create purchase order"/></div></SectionCard></div>
      <div data-dashboard-widget="growth"><SectionCard title="Growth centre"><div className="grid gap-3"><Growth icon={faCoins} title="TRS Coins" text="Manage earning, redemption and adjustment rules." href="/admin/rewards"/><Growth icon={faUserPlus} title="Referral programme" text="Monitor signups, first orders and reward eligibility." href="/admin/referrals"/></div></SectionCard></div>
    </div>
  </>;
}
function Pulse({ icon, label, value }: { icon: IconDefinition; label: string; value: number|string }) { return <div className="rounded-2xl border border-[#eee4dc] bg-[#fffaf6] p-4"><FontAwesomeIcon icon={icon} className="h-4 text-[#C8102E]"/><p className="mt-4 text-2xl font-black text-[#173044]">{value}</p><p className="mt-1 text-[9px] font-black uppercase tracking-wider text-[#8d8178]">{label}</p></div> }
function Quick({ href, label }: { href: string; label: string }) { return <Link href={href} className="flex items-center justify-between rounded-xl border border-[#eee4dc] px-4 py-3 text-xs font-extrabold text-[#193044] transition hover:border-[#C8102E] hover:text-[#C8102E]"><span>{label}</span><span>→</span></Link> }
function Growth({ icon, title, text, href }: { icon: IconDefinition; title: string; text: string; href: string }) { return <Link href={href} className="flex gap-4 rounded-2xl border border-[#eee4dc] p-4 transition hover:border-[#C8102E]"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fff0e8] text-[#C8102E]"><FontAwesomeIcon icon={icon}/></span><span><b className="text-xs text-[#183043]">{title}</b><span className="mt-1 block text-[10px] leading-5 text-[#8d8178]">{text}</span></span></Link> }
