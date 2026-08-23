"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faBell,
  faCircleUser,
  faCoins,
  faGaugeHigh,
  faGear,
  faLock,
  faReceipt,
  faRightFromBracket,
  faStar,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/customer-dashboard", label: "Overview", icon: faGaugeHigh },
  { href: "/customer-dashboard/orders", label: "My Orders", icon: faReceipt },
  { href: "/customer-dashboard/rewards", label: "Rewards & Coins", icon: faCoins },
  { href: "/customer-dashboard/reviews", label: "Reviews", icon: faStar },
  { href: "/customer-dashboard/notifications", label: "Notifications", icon: faBell },
  { href: "/customer-dashboard/profile", label: "My Profile", icon: faCircleUser },
  { href: "/customer-dashboard/security", label: "Security", icon: faLock },
];

export function CustomerDashboardShell({ children, customerName }: { children: React.ReactNode; customerName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-[#111] text-white">
      <div className="border-b border-white/10 px-6 py-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#D9A441]">TRS Customer</p>
        <h2 className="mt-2 text-xl font-black">Welcome, {customerName.split(" ")[0]}</h2>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="Customer dashboard">
        {links.map((link) => {
          const active = pathname === link.href || (link.href !== "/customer-dashboard" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${active ? "bg-[#C8102E] text-white" : "text-white/75 hover:bg-white/10 hover:text-white"}`}
            >
              <FontAwesomeIcon icon={link.icon} className="w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4">
        <button onClick={logout} disabled={loggingOut} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold text-white/75 transition hover:bg-white/10 hover:text-white disabled:opacity-60">
          <FontAwesomeIcon icon={faRightFromBracket} className="w-4" />
          {loggingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#F7F2EC]">
      <div className="mx-auto grid max-w-[1600px] lg:grid-cols-[280px_1fr]">
        <aside className="sticky top-0 hidden h-screen lg:block">{sidebar}</aside>
        <div className="min-w-0">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-black/5 bg-white/95 px-4 py-4 backdrop-blur md:px-8">
            <button onClick={() => setOpen(true)} className="grid h-11 w-11 place-items-center rounded-xl border border-black/10 lg:hidden" aria-label="Open dashboard menu">
              <FontAwesomeIcon icon={faBars} />
            </button>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#A50E27]">The Rolling Stove</p>
              <p className="font-black text-[#171717]">Customer Dashboard</p>
            </div>
            <Link href="/customer-dashboard/profile" className="grid h-11 w-11 place-items-center rounded-full bg-[#111] text-white" aria-label="Open profile">
              <FontAwesomeIcon icon={faGear} />
            </Link>
          </header>
          <main className="p-4 md:p-8">{children}</main>
        </div>
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} aria-label="Close dashboard menu" />
          <div className="relative h-full w-[86%] max-w-[320px] shadow-2xl">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white" aria-label="Close dashboard menu">
              <FontAwesomeIcon icon={faXmark} />
            </button>
            {sidebar}
          </div>
        </div>
      ) : null}
    </div>
  );
}
