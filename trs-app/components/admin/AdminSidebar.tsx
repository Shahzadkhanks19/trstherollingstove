"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { adminNavigation } from "@/lib/admin/navigation";
import { prefetchAdminRoute } from "@/lib/admin/client-route-warmup";

type Props = {
  open: boolean;
  onClose: () => void;
  permissions: string[];
};

export function AdminSidebar({ open, onClose, permissions }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const allowed = (permission?: string) =>
    !permission || permissions.includes(permission);

  const visibleItems = adminNavigation.flatMap((group) =>
    group.items.filter((item) => allowed(item.permission)),
  );

  const activeHref = visibleItems
    .filter(
      (item) =>
        pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((first, second) => second.href.length - first.href.length)[0]?.href;

  const warmRoute = (href: string) => {
    if (href !== activeHref) prefetchAdminRoute(router, href);
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
        className={`fixed inset-0 z-[91] bg-black/45 backdrop-blur-sm transition lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-[92] flex w-[286px] flex-col bg-[#111820] text-white shadow-2xl transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <Link
            href="/admin/dashboard"
            prefetch={false}
            onMouseEnter={() => warmRoute("/admin/dashboard")}
            onFocus={() => warmRoute("/admin/dashboard")}
            className="flex items-center gap-3"
            onClick={onClose}
          >
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#C8102E] text-sm font-black shadow-[0_10px_24px_rgba(200,16,46,.3)]">
              TRS
            </span>
            <span>
              <b className="block text-sm tracking-[.16em]">ADMIN</b>
              <span className="text-[10px] font-bold uppercase tracking-[.2em] text-[#E8A53A]">
                Operations Suite
              </span>
            </span>
          </Link>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="grid h-9 w-9 place-items-center rounded-xl hover:bg-white/10 lg:hidden"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-5 [scrollbar-width:thin]">
          {adminNavigation.map((group) => {
            const items = group.items.filter((item) => allowed(item.permission));
            if (!items.length) return null;

            return (
              <div key={group.label} className="mb-6">
                <p className="mb-2 px-3 text-[9px] font-black uppercase tracking-[.24em] text-white/35">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {items.map((item) => {
                    const active = activeHref === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        prefetch={false}
                        onMouseEnter={() => warmRoute(item.href)}
                        onFocus={() => warmRoute(item.href)}
                        onClick={onClose}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold transition ${
                          active
                            ? "bg-[#C8102E] text-white shadow-[0_8px_20px_rgba(200,16,46,.24)]"
                            : "text-white/67 hover:bg-white/7 hover:text-white"
                        }`}
                      >
                        <FontAwesomeIcon
                          icon={item.icon}
                          className={`h-4 w-4 ${active ? "text-white" : "text-[#E8A53A]"}`}
                        />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="rounded-2xl bg-white/[.06] p-4">
            <p className="text-xs font-black">TRS Operations</p>
            <p className="mt-1 text-[10px] leading-5 text-white/45">
              Dine-in · Pickup · Kitchen · Inventory
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
