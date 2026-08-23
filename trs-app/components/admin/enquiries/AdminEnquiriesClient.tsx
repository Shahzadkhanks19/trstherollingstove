"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight, faEnvelope, faEnvelopeOpen, faEye, faRotate, faSearch, faTrash } from "@fortawesome/free-solid-svg-icons";
import { PageHeader, StatCard } from "@/components/admin/AdminPrimitives";
import { CustomActionModal } from "@/components/admin/CustomActionModal";

import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

type ApiResponse<T> = { success: boolean; message: string; data: T };
type EnquiryStatus = "new" | "in_progress" | "resolved" | "closed";
type Enquiry = { _id: string; name: string; email: string; phone: string; subject: string; message: string; status: EnquiryStatus; isRead: boolean; adminNote?: string; createdAt: string; updatedAt: string };
type Payload = { items: Enquiry[]; pagination: { page: number; limit: number; total: number; pages: number }; statusCounts: Record<string, number> };
const dateTime = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" });
const tones: Record<EnquiryStatus, string> = { new: "bg-blue-50 text-blue-700", in_progress: "bg-amber-50 text-amber-700", resolved: "bg-emerald-50 text-emerald-700", closed: "bg-slate-100 text-slate-700" };

export function AdminEnquiriesClient({ canManage }: { canManage: boolean }) {
  const [items, setItems] = useState<Enquiry[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Enquiry | null>(null);
  const [acting, setActing] = useState(false);

  const query = useMemo(() => { const params = new URLSearchParams({ page: String(page), limit: "20", status }); if (search) params.set("search", search); return params.toString(); }, [page, search, status]);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const response = await fetch(`/api/v1/admin/enquiries?${query}`, { cache: "no-store" }); const payload = await response.json() as ApiResponse<Payload>; if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to load enquiries."); setItems(payload.data.items); setPages(payload.data.pagination.pages); setTotal(payload.data.pagination.total); setCounts(payload.data.statusCounts); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load enquiries."); }
    finally { setLoading(false); }
  }, [query]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => { const timer = window.setTimeout(()=>{setSearch(searchInput.trim());setPage(1);},300); return ()=>window.clearTimeout(timer); }, [searchInput]);
  useRealtimeRefresh({ events: ["enquiry.created", "enquiry.updated"], onEvent: () => load() });

  async function openEnquiry(id: string) {
    const response = await fetch(`/api/v1/admin/enquiries/${id}`, { cache: "no-store" }); const payload = await response.json() as ApiResponse<Enquiry>;
    if (!response.ok || !payload.success) { setError(payload.message || "Unable to load enquiry."); return; }
    setSelected(payload.data); setItems((current)=>current.map((item)=>item._id===id ? payload.data : item));
  }
  async function updateStatus(next: EnquiryStatus) {
    if (!selected || !canManage) return; setActing(true);
    try { const response = await fetch(`/api/v1/admin/enquiries/${selected._id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({status:next,isRead:true}) }); const payload = await response.json() as ApiResponse<Enquiry>; if(!response.ok||!payload.success) throw new Error(payload.message||"Unable to update enquiry."); setSelected(payload.data); await load(); }
    catch(cause){setError(cause instanceof Error?cause.message:"Unable to update enquiry.");} finally{setActing(false);}
  }
  async function deleteEnquiry() {
    if (!pendingDelete) return; setActing(true);
    try { const response = await fetch(`/api/v1/admin/enquiries/${pendingDelete._id}`, { method:"DELETE" }); const payload = await response.json() as ApiResponse<{id:string}>; if(!response.ok||!payload.success) throw new Error(payload.message||"Unable to delete enquiry."); if(selected?._id===pendingDelete._id)setSelected(null); setPendingDelete(null); await load(); }
    catch(cause){setError(cause instanceof Error?cause.message:"Unable to delete enquiry.");} finally{setActing(false);}
  }

  return <>
    <PageHeader eyebrow="Customer communication" title="Enquiries" description="Manage contact-form submissions, track follow-ups, and close resolved conversations." />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="All enquiries" value={String(counts.all ?? total)} icon={faEnvelope} detail="All contact submissions"/><StatCard label="New" value={String(counts.new ?? 0)} icon={faEnvelope} detail="Awaiting first response"/><StatCard label="In progress" value={String(counts.in_progress ?? 0)} icon={faEnvelopeOpen} detail="Currently being handled"/><StatCard label="Resolved" value={String(counts.resolved ?? 0)} icon={faEnvelopeOpen} detail="Completed conversations"/></div>
    <section className="mt-6 overflow-hidden rounded-[24px] border border-[#e8ddd3] bg-[#fffdf9] shadow-[0_10px_32px_rgba(30,35,40,.05)]"><div className="flex flex-col gap-3 border-b border-[#eee4dc] p-4 md:flex-row md:items-center md:justify-between"><label className="relative block w-full md:max-w-md"><FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#968a81]"/><input value={searchInput} onChange={(e)=>setSearchInput(e.target.value)} placeholder="Search name, email, phone or subject" className="min-h-11 w-full rounded-xl border border-[#e2d7ce] bg-white pl-11 pr-4 text-sm font-semibold outline-none focus:border-[#C8102E]"/></label><div className="flex gap-2"><select value={status} onChange={(e)=>{setStatus(e.target.value);setPage(1);}} className="min-h-11 rounded-xl border border-[#e2d7ce] bg-white px-3 text-xs font-black"><option value="all">All statuses</option><option value="new">New</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select><button onClick={()=>void load()} className="grid h-11 w-11 place-items-center rounded-xl border border-[#e2d7ce] bg-white"><FontAwesomeIcon icon={faRotate}/></button></div></div>
      {error && <p role="alert" className="m-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-[#faf5ef] text-[10px] font-black uppercase tracking-wider text-[#756960]"><tr><th className="px-5 py-3">Sender</th><th className="px-5 py-3">Subject</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Received</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#eee4dc]">{loading?<tr><td colSpan={5} className="px-5 py-14 text-center font-semibold text-[#756960]">Loading enquiries…</td></tr>:items.length===0?<tr><td colSpan={5} className="px-5 py-14 text-center font-semibold text-[#756960]">No enquiries found.</td></tr>:items.map((item)=><tr key={item._id} className={`${item.isRead?"":"bg-blue-50/35"} hover:bg-[#fffaf5]`}><td className="px-5 py-4"><div className="flex items-center gap-3"><span className={`h-2.5 w-2.5 rounded-full ${item.isRead?"bg-transparent":"bg-blue-600"}`}/><div><p className="font-black text-[#173044]">{item.name}</p><p className="mt-1 text-xs text-[#8c7f76]">{item.email}</p></div></div></td><td className="max-w-md px-5 py-4"><p className="font-black text-[#173044]">{item.subject}</p><p className="mt-1 line-clamp-1 text-xs text-[#756960]">{item.message}</p></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${tones[item.status]}`}>{item.status.replace("_"," ")}</span></td><td className="px-5 py-4 text-xs font-semibold text-[#756960]">{dateTime.format(new Date(item.createdAt))}</td><td className="px-5 py-4"><div className="flex justify-end gap-2"><button onClick={()=>void openEnquiry(item._id)} aria-label="View enquiry" className="grid h-10 w-10 place-items-center rounded-xl border border-[#e2d7ce] bg-white"><FontAwesomeIcon icon={faEye}/></button>{canManage&&<button onClick={()=>setPendingDelete(item)} aria-label="Delete enquiry" className="grid h-10 w-10 place-items-center rounded-xl bg-red-50 text-red-700"><FontAwesomeIcon icon={faTrash}/></button>}</div></td></tr>)}</tbody></table></div>
      <div className="flex items-center justify-between border-t border-[#eee4dc] px-5 py-4 text-xs font-bold text-[#756960]"><span>{total} enquiries · Page {page} of {pages}</span><div className="flex gap-2"><button disabled={page<=1} onClick={()=>setPage((v)=>v-1)} className="grid h-10 w-10 place-items-center rounded-xl border border-[#e2d7ce] disabled:opacity-40"><FontAwesomeIcon icon={faChevronLeft}/></button><button disabled={page>=pages} onClick={()=>setPage((v)=>v+1)} className="grid h-10 w-10 place-items-center rounded-xl border border-[#e2d7ce] disabled:opacity-40"><FontAwesomeIcon icon={faChevronRight}/></button></div></div>
    </section>
    {selected&&<div className="fixed inset-0 z-[170] bg-black/45 p-4 backdrop-blur-sm" onMouseDown={(e)=>{if(e.target===e.currentTarget)setSelected(null);}}><aside className="ml-auto h-full w-full max-w-xl overflow-y-auto rounded-[28px] bg-[#fffdf9] p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#C8102E]">Enquiry details</p><h2 className="mt-2 text-2xl font-black text-[#173044]">{selected.subject}</h2></div><button onClick={()=>setSelected(null)} className="rounded-xl border px-3 py-2 text-xs font-black">Close</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><Info label="Name" value={selected.name}/><Info label="Phone" value={selected.phone}/><Info label="Email" value={selected.email}/><Info label="Received" value={dateTime.format(new Date(selected.createdAt))}/></div><div className="mt-4 rounded-2xl border border-[#eadfd5] bg-white p-4"><p className="text-[10px] font-black uppercase tracking-wider text-[#8c7f76]">Message</p><p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-7 text-[#554b45]">{selected.message}</p></div>{canManage&&<div className="mt-6"><p className="mb-2 text-[10px] font-black uppercase tracking-wider text-[#8c7f76]">Update status</p><div className="grid gap-2 sm:grid-cols-4">{(["new","in_progress","resolved","closed"] as EnquiryStatus[]).map((value)=><button key={value} disabled={acting||selected.status===value} onClick={()=>void updateStatus(value)} className="min-h-11 rounded-xl border border-[#e2d7ce] bg-white px-3 text-[10px] font-black uppercase disabled:bg-[#173044] disabled:text-white">{value.replace("_"," ")}</button>)}</div></div>}</aside></div>}
    <CustomActionModal open={Boolean(pendingDelete)} title="Delete enquiry" description="This permanently removes the contact message from the admin system." confirmLabel="Delete" tone="danger" loading={acting} onClose={()=>setPendingDelete(null)} onConfirm={deleteEnquiry}/>
  </>;
}
function Info({label,value}:{label:string;value:string}){return <div className="rounded-2xl border border-[#eadfd5] bg-white p-4"><p className="text-[10px] font-black uppercase tracking-wider text-[#8c7f76]">{label}</p><p className="mt-2 break-words text-sm font-semibold text-[#173044]">{value}</p></div>}
