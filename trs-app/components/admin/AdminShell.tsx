"use client";
import { useState } from "react";
import { AdminRouteWarmup } from "@/components/admin/AdminRouteWarmup";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";

type Props = { children: React.ReactNode; user: { name: string; roleKey: string; permissions: string[] } };
export function AdminShell({ children, user }: Props) {
  const [open, setOpen] = useState(false);
  return <div className="fixed inset-0 z-[90] overflow-hidden bg-[#f7f1eb] text-[#18232d]">
    <AdminRouteWarmup />
    <AdminSidebar open={open} onClose={() => setOpen(false)} permissions={user.permissions} />
    <div className="flex h-full min-w-0 flex-col lg:pl-[286px]">
      <AdminTopbar name={user.name} role={user.roleKey} onMenu={() => setOpen(true)} />
      <main className="min-h-0 flex-1 overflow-y-auto"><div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">{children}</div></main>
    </div>
  </div>;
}
