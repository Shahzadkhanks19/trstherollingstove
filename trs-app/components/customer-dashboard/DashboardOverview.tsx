"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarCheck, faCoins, faReceipt, faUtensils } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { useEffect, useState } from "react";

type Summary = {
  customer: { user: { name: string; email: string } };
  stats: { totalOrders: number; completedOrders: number; activeOrders: number; upcomingReservations: number; coinBalance: number; loyaltyTier: string; annualSpend: number };
  recentOrders: Array<{ id: string; orderNumber: string; status: string; orderMode: string; grandTotal: number; itemCount: number; createdAt: string }>;
};

type ApiResponse = { success: boolean; message: string; data: Summary };
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function DashboardOverview() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/v1/customer/dashboard-summary", { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json()) as ApiResponse;
        if (!response.ok) throw new Error(body.message || "Could not load dashboard.");
        setSummary(body.data);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load dashboard."));
  }, []);

  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 font-semibold text-red-700">{error}</div>;
  if (!summary) return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-2xl bg-white" />)}</div>;

  const cards = [
    { label: "Total orders", value: summary.stats.totalOrders, icon: faReceipt },
    { label: "Active orders", value: summary.stats.activeOrders, icon: faUtensils },
    { label: "Upcoming reservations", value: summary.stats.upcomingReservations, icon: faCalendarCheck },
    { label: "TRS Coins", value: summary.stats.coinBalance, icon: faCoins },
  ];

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl bg-[#111] p-6 text-white shadow-xl md:p-9">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#D9A441]">Your TRS account</p>
            <h1 className="mt-3 text-3xl font-black md:text-4xl">Good to see you, {summary.customer.user.name.split(" ")[0]}.</h1>
            <p className="mt-3 max-w-2xl text-white/65">Track your orders, manage your profile, view rewards and keep every TRS experience in one place.</p>
          </div>
          <div className="rounded-2xl border border-[#D9A441]/30 bg-[#D9A441]/10 px-6 py-5">
            <p className="text-xs font-bold uppercase tracking-wider text-[#D9A441]">Loyalty tier</p>
            <p className="mt-1 text-2xl font-black capitalize">{summary.stats.loyaltyTier}</p>
            <p className="mt-1 text-sm text-white/60">Annual spend {money.format(summary.stats.annualSpend)}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div><p className="text-sm font-bold text-black/50">{card.label}</p><p className="mt-3 text-3xl font-black">{card.value}</p></div>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#C8102E]/10 text-[#C8102E]"><FontAwesomeIcon icon={card.icon} /></span>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm md:p-7">
        <div className="mb-5 flex items-center justify-between gap-4"><div><h2 className="text-xl font-black">Recent orders</h2><p className="mt-1 text-sm text-black/50">Your latest TRS activity</p></div><Link href="/customer-dashboard/orders" className="text-sm font-extrabold text-[#A50E27]">View all</Link></div>
        {summary.recentOrders.length ? <div className="divide-y divide-black/5">{summary.recentOrders.map((order) => <div key={order.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"><div><p className="font-black">#{order.orderNumber}</p><p className="mt-1 text-sm text-black/50">{order.itemCount} item{order.itemCount === 1 ? "" : "s"} · {order.orderMode.replace("_", " ")}</p></div><span className="w-fit rounded-full bg-black/5 px-3 py-1 text-xs font-extrabold capitalize">{order.status}</span><p className="font-black">{money.format(order.grandTotal)}</p></div>)}</div> : <div className="rounded-2xl bg-[#F7F2EC] p-8 text-center"><p className="font-bold">No orders yet.</p><Link href="/menu" className="mt-3 inline-block font-extrabold text-[#A50E27]">Explore the menu</Link></div>}
      </section>
    </div>
  );
}
