"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight, faDownload, faEye, faRotate, faSearch, faUserCheck, faUserClock, faUsers } from "@fortawesome/free-solid-svg-icons";
import { PageHeader, StatCard } from "@/components/admin/AdminPrimitives";
import { CustomActionModal } from "@/components/admin/CustomActionModal";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

type ApiResponse<T> = { success: boolean; message: string; data: T; meta?: { page: number; limit: number; total: number; totalPages: number } };
type Customer = {
  user: { _id: string; name: string; email: string; phone?: string; avatarUrl?: string; isActive: boolean; emailVerifiedAt?: string | null; lastLoginAt?: string | null; createdAt: string };
  profile: { preferredName?: string; dietaryNotes?: string; adminNotes?: string; source?: string; tags?: string[]; preferredCommunicationChannel?: string } | null;
};

const dateTime = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" });

export function AdminCustomersClient({ canUpdate }: { canUpdate: boolean }) {
  const [items, setItems] = useState<Customer[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [pendingToggle, setPendingToggle] = useState<Customer | null>(null);
  const [acting, setActing] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    if (status !== "all") params.set("isActive", status);
    return params.toString();
  }, [page, search, status]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/v1/admin/customers?${query}`, { cache: "no-store" });
      const payload = await response.json() as ApiResponse<Customer[]>;
      if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to load customers.");
      setItems(payload.data); setTotal(payload.meta?.total ?? 0); setPages(payload.meta?.totalPages ?? 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load customers."); }
    finally { setLoading(false); }
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => { const timer = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300); return () => window.clearTimeout(timer); }, [searchInput]);
  useRealtimeRefresh({ events: ["user.updated", "user.deactivated"], onEvent: () => load() });

  async function openCustomer(id: string) {
    const response = await fetch(`/api/v1/admin/customers/${id}`, { cache: "no-store" });
    const payload = await response.json() as ApiResponse<Customer>;
    if (response.ok && payload.success) setSelected(payload.data); else setError(payload.message || "Unable to load customer.");
  }

  async function toggleCustomer(reason: string) {
    if (!pendingToggle) return;
    setActing(true);
    try {
      const response = await fetch(`/api/v1/admin/customers/${pendingToggle.user._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !pendingToggle.user.isActive, deactivationReason: reason }) });
      const payload = await response.json() as ApiResponse<Customer>;
      if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to update customer.");
      setPendingToggle(null); await load(); if (selected?.user._id === payload.data.user._id) setSelected(payload.data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update customer."); }
    finally { setActing(false); }
  }

  const active = items.filter((item) => item.user.isActive).length;
  const verified = items.filter((item) => Boolean(item.user.emailVerifiedAt)).length;

  return <>
    <PageHeader eyebrow="Customer CRM" title="Customers" description="Search customer accounts, review profile details, and control account access." action={<Link href="/api/v1/admin/customers/export" prefetch={false} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#173044] px-4 text-xs font-black text-white"><FontAwesomeIcon icon={faDownload}/> Export CSV</Link>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><StatCard label="Total customers" value={String(total)} icon={faUsers} detail="All registered customer accounts"/><StatCard label="Active on page" value={String(active)} icon={faUserCheck} detail="Active customers in current results"/><StatCard label="Verified on page" value={String(verified)} icon={faUserClock} detail="Email-verified customers"/></div>
    <section className="mt-6 overflow-hidden rounded-[24px] border border-[#e8ddd3] bg-[#fffdf9] shadow-[0_10px_32px_rgba(30,35,40,.05)]">
      <div className="flex flex-col gap-3 border-b border-[#eee4dc] p-4 md:flex-row md:items-center md:justify-between">
        <label className="relative block w-full md:max-w-md"><FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#968a81]"/><input value={searchInput} onChange={(e)=>setSearchInput(e.target.value)} placeholder="Search name, email or phone" className="min-h-11 w-full rounded-xl border border-[#e2d7ce] bg-white pl-11 pr-4 text-sm font-semibold outline-none focus:border-[#C8102E]"/></label>
        <div className="flex gap-2"><select value={status} onChange={(e)=>{setStatus(e.target.value);setPage(1);}} className="min-h-11 rounded-xl border border-[#e2d7ce] bg-white px-3 text-xs font-black"><option value="all">All customers</option><option value="true">Active</option><option value="false">Inactive</option></select><button onClick={()=>void load()} aria-label="Refresh customers" className="grid h-11 w-11 place-items-center rounded-xl border border-[#e2d7ce] bg-white"><FontAwesomeIcon icon={faRotate}/></button></div>
      </div>
      {error && <p role="alert" className="m-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-[#faf5ef] text-[10px] font-black uppercase tracking-wider text-[#756960]"><tr><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Contact</th><th className="px-5 py-3">Source</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Joined</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#eee4dc]">
        {loading ? <tr><td colSpan={6} className="px-5 py-14 text-center font-semibold text-[#756960]">Loading customers…</td></tr> : items.length === 0 ? <tr><td colSpan={6} className="px-5 py-14 text-center font-semibold text-[#756960]">No customers found.</td></tr> : items.map((item)=><tr key={item.user._id} className="hover:bg-[#fffaf5]"><td className="px-5 py-4"><p className="font-black text-[#173044]">{item.user.name}</p><p className="mt-1 text-xs text-[#8c7f76]">{item.profile?.preferredName || "No preferred name"}</p></td><td className="px-5 py-4"><p className="font-semibold text-[#173044]">{item.user.email}</p><p className="mt-1 text-xs text-[#8c7f76]">{item.user.phone || "No phone"}</p></td><td className="px-5 py-4 text-xs font-bold uppercase text-[#756960]">{item.profile?.source || "website"}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${item.user.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{item.user.isActive ? "Active" : "Inactive"}</span></td><td className="px-5 py-4 text-xs font-semibold text-[#756960]">{dateTime.format(new Date(item.user.createdAt))}</td><td className="px-5 py-4"><div className="flex justify-end gap-2"><button onClick={()=>void openCustomer(item.user._id)} aria-label={`View ${item.user.name}`} className="grid h-10 w-10 place-items-center rounded-xl border border-[#e2d7ce] bg-white"><FontAwesomeIcon icon={faEye}/></button>{canUpdate && <button onClick={()=>setPendingToggle(item)} className={`min-h-10 rounded-xl px-3 text-[10px] font-black ${item.user.isActive ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{item.user.isActive ? "Deactivate" : "Activate"}</button>}</div></td></tr>)}
      </tbody></table></div>
      <div className="flex items-center justify-between border-t border-[#eee4dc] px-5 py-4 text-xs font-bold text-[#756960]"><span>Page {page} of {pages}</span><div className="flex gap-2"><button disabled={page<=1} onClick={()=>setPage((v)=>v-1)} className="grid h-10 w-10 place-items-center rounded-xl border border-[#e2d7ce] disabled:opacity-40"><FontAwesomeIcon icon={faChevronLeft}/></button><button disabled={page>=pages} onClick={()=>setPage((v)=>v+1)} className="grid h-10 w-10 place-items-center rounded-xl border border-[#e2d7ce] disabled:opacity-40"><FontAwesomeIcon icon={faChevronRight}/></button></div></div>
    </section>
    {selected && <div className="fixed inset-0 z-[170] bg-black/45 p-4 backdrop-blur-sm" onMouseDown={(e)=>{if(e.target===e.currentTarget)setSelected(null);}}><aside className="ml-auto h-full w-full max-w-lg overflow-y-auto rounded-[28px] bg-[#fffdf9] p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#C8102E]">Customer profile</p><h2 className="mt-2 text-2xl font-black text-[#173044]">{selected.user.name}</h2></div><button onClick={()=>setSelected(null)} className="rounded-xl border px-3 py-2 text-xs font-black">Close</button></div><div className="mt-6 grid gap-4 text-sm"><Detail label="Email" value={selected.user.email}/><Detail label="Phone" value={selected.user.phone || "Not provided"}/><Detail label="Preferred communication" value={selected.profile?.preferredCommunicationChannel || "Not selected"}/><Detail label="Dietary notes" value={selected.profile?.dietaryNotes || "None"}/><Detail label="Admin notes" value={selected.profile?.adminNotes || "None"}/><Detail label="Tags" value={selected.profile?.tags?.join(", ") || "None"}/><Detail label="Last login" value={selected.user.lastLoginAt ? dateTime.format(new Date(selected.user.lastLoginAt)) : "Never"}/></div></aside></div>}
    <CustomActionModal open={Boolean(pendingToggle)} title={pendingToggle?.user.isActive ? "Deactivate customer" : "Activate customer"} description={pendingToggle?.user.isActive ? "This immediately revokes active sessions and blocks future sign-in." : "This restores access to the customer account."} confirmLabel={pendingToggle?.user.isActive ? "Deactivate" : "Activate"} tone={pendingToggle?.user.isActive ? "danger" : "default"} inputLabel={pendingToggle?.user.isActive ? "Reason" : undefined} inputRequired={Boolean(pendingToggle?.user.isActive)} loading={acting} onClose={()=>setPendingToggle(null)} onConfirm={toggleCustomer}/>
  </>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-[#eadfd5] bg-white p-4"><p className="text-[10px] font-black uppercase tracking-wider text-[#8c7f76]">{label}</p><p className="mt-2 whitespace-pre-wrap font-semibold text-[#173044]">{value}</p></div>; }
