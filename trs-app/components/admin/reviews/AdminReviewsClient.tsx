"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight, faEye, faReply, faRotate, faStar } from "@fortawesome/free-solid-svg-icons";
import { PageHeader } from "@/components/admin/AdminPrimitives";
import { CustomActionModal } from "@/components/admin/CustomActionModal";

import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

type ApiResponse<T> = { success: boolean; message: string; data: T };
type Review = {
  _id: string;
  rating: number;
  title?: string;
  comment?: string;
  status: "pending" | "published" | "rejected" | "hidden";
  recommendation: string;
  tags?: string[];
  images?: string[];
  isFeatured?: boolean;
  helpfulCount?: number;
  createdAt: string;
  moderationNote?: string;
  ownerReply?: { message?: string; repliedAt?: string };
  customerId?: { name?: string; email?: string; phone?: string };
  orderId?: { orderNumber?: string };
};

type Payload = { reviews: Review[]; pagination: { page: number; limit: number; total: number; pages: number }; statusCounts: Record<string, number> };
const dateTime = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" });
const tones: Record<string, string> = { pending: "bg-amber-50 text-amber-700", published: "bg-emerald-50 text-emerald-700", rejected: "bg-red-50 text-red-700", hidden: "bg-slate-100 text-slate-700" };

export function AdminReviewsClient({ canManage }: { canManage: boolean }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [status, setStatus] = useState("all");
  const [rating, setRating] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Review | null>(null);
  const [action, setAction] = useState<{ type: "publish" | "reject" | "hide" | "reply"; review: Review } | null>(null);
  const [acting, setActing] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (status !== "all") params.set("status", status);
    if (rating !== "all") params.set("rating", rating);
    return params.toString();
  }, [page, rating, status]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/v1/admin/reviews?${query}`, { cache: "no-store" });
      const payload = await response.json() as ApiResponse<Payload>;
      if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to load reviews.");
      setReviews(payload.data.reviews); setPages(Math.max(1, payload.data.pagination.pages)); setTotal(payload.data.pagination.total); setCounts(payload.data.statusCounts);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load reviews."); }
    finally { setLoading(false); }
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useRealtimeRefresh({ events: ["review.created", "review.updated"], onEvent: () => load() });
  async function submitAction(value: string) {
    if (!action) return;
    setActing(true);
    try {
      const isReply = action.type === "reply";
      const response = await fetch(`/api/v1/admin/reviews/${action.review._id}/${isReply ? "reply" : "moderate"}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isReply ? { message: value } : { status: action.type === "publish" ? "published" : action.type === "reject" ? "rejected" : "hidden", moderationNote: value }),
      });
      const payload = await response.json() as ApiResponse<Review>;
      if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to update review.");
      setAction(null); setSelected((current) => current?._id === payload.data._id ? payload.data : current); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update review."); }
    finally { setActing(false); }
  }

  return <>
    <PageHeader eyebrow="Customer feedback" title="Reviews" description={`Moderate ratings, feature strong testimonials, and reply to customer feedback. ${counts.pending ?? 0} pending.`} />
    <section className="overflow-hidden rounded-[24px] border border-[#e8ddd3] bg-[#fffdf9] shadow-[0_10px_32px_rgba(30,35,40,.05)]">
      <div className="flex flex-col gap-3 border-b border-[#eee4dc] p-4 md:flex-row md:items-center md:justify-between"><div className="flex flex-wrap gap-2"><select value={status} onChange={(e)=>{setStatus(e.target.value);setPage(1);}} className="min-h-11 rounded-xl border border-[#e2d7ce] bg-white px-3 text-xs font-black"><option value="all">All statuses</option><option value="pending">Pending</option><option value="published">Published</option><option value="rejected">Rejected</option><option value="hidden">Hidden</option></select><select value={rating} onChange={(e)=>{setRating(e.target.value);setPage(1);}} className="min-h-11 rounded-xl border border-[#e2d7ce] bg-white px-3 text-xs font-black"><option value="all">All ratings</option>{[5,4,3,2,1].map((value)=><option key={value} value={value}>{value} stars</option>)}</select></div><button onClick={()=>void load()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#e2d7ce] bg-white px-4 text-xs font-black"><FontAwesomeIcon icon={faRotate}/> Refresh</button></div>
      {error && <p role="alert" className="m-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-[#faf5ef] text-[10px] font-black uppercase tracking-wider text-[#756960]"><tr><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Review</th><th className="px-5 py-3">Rating</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Date</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#eee4dc]">{loading ? <tr><td colSpan={6} className="px-5 py-14 text-center font-semibold text-[#756960]">Loading reviews…</td></tr> : reviews.length === 0 ? <tr><td colSpan={6} className="px-5 py-14 text-center font-semibold text-[#756960]">No reviews found.</td></tr> : reviews.map((review)=><tr key={review._id} className="hover:bg-[#fffaf5]"><td className="px-5 py-4"><p className="font-black text-[#173044]">{review.customerId?.name || "Customer"}</p><p className="mt-1 text-xs text-[#8c7f76]">{review.orderId?.orderNumber || "Order unavailable"}</p></td><td className="max-w-md px-5 py-4"><p className="font-black text-[#173044]">{review.title || "Untitled review"}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-[#756960]">{review.comment || "No written comment."}</p></td><td className="px-5 py-4"><span className="inline-flex items-center gap-1 font-black text-amber-600"><FontAwesomeIcon icon={faStar}/>{review.rating}</span></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${tones[review.status]}`}>{review.status}</span></td><td className="px-5 py-4 text-xs font-semibold text-[#756960]">{dateTime.format(new Date(review.createdAt))}</td><td className="px-5 py-4"><div className="flex justify-end gap-2"><button onClick={()=>setSelected(review)} aria-label="View review" className="grid h-10 w-10 place-items-center rounded-xl border border-[#e2d7ce] bg-white"><FontAwesomeIcon icon={faEye}/></button>{canManage && <button onClick={()=>setAction({type:"reply",review})} aria-label="Reply to review" className="grid h-10 w-10 place-items-center rounded-xl border border-[#e2d7ce] bg-white"><FontAwesomeIcon icon={faReply}/></button>}</div></td></tr>)}</tbody></table></div>
      <div className="flex items-center justify-between border-t border-[#eee4dc] px-5 py-4 text-xs font-bold text-[#756960]"><span>{total} reviews · Page {page} of {pages}</span><div className="flex gap-2"><button disabled={page<=1} onClick={()=>setPage((v)=>v-1)} className="grid h-10 w-10 place-items-center rounded-xl border border-[#e2d7ce] disabled:opacity-40"><FontAwesomeIcon icon={faChevronLeft}/></button><button disabled={page>=pages} onClick={()=>setPage((v)=>v+1)} className="grid h-10 w-10 place-items-center rounded-xl border border-[#e2d7ce] disabled:opacity-40"><FontAwesomeIcon icon={faChevronRight}/></button></div></div>
    </section>
    {selected && <div className="fixed inset-0 z-[170] bg-black/45 p-4 backdrop-blur-sm" onMouseDown={(e)=>{if(e.target===e.currentTarget)setSelected(null);}}><aside className="ml-auto h-full w-full max-w-xl overflow-y-auto rounded-[28px] bg-[#fffdf9] p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#C8102E]">Review details</p><h2 className="mt-2 text-2xl font-black text-[#173044]">{selected.title || "Customer review"}</h2></div><button onClick={()=>setSelected(null)} className="rounded-xl border px-3 py-2 text-xs font-black">Close</button></div><div className="mt-5 flex gap-1 text-amber-500">{Array.from({length:5},(_,i)=><FontAwesomeIcon key={i} icon={faStar} className={i<selected.rating ? "" : "opacity-20"}/>)}</div><p className="mt-5 whitespace-pre-wrap text-sm font-medium leading-7 text-[#554b45]">{selected.comment || "No written comment."}</p>{selected.tags?.length ? <div className="mt-5 flex flex-wrap gap-2">{selected.tags.map((tag)=><span key={tag} className="rounded-full bg-[#fff0e8] px-3 py-1 text-[10px] font-black text-[#C8102E]">{tag}</span>)}</div> : null}{selected.ownerReply?.message && <div className="mt-5 rounded-2xl border border-[#eadfd5] bg-white p-4"><p className="text-[10px] font-black uppercase tracking-wider text-[#8c7f76]">Owner reply</p><p className="mt-2 text-sm font-semibold leading-6 text-[#173044]">{selected.ownerReply.message}</p></div>}{canManage && <div className="mt-6 grid gap-2 sm:grid-cols-3"><button onClick={()=>setAction({type:"publish",review:selected})} className="min-h-11 rounded-xl bg-emerald-700 text-xs font-black text-white">Publish</button><button onClick={()=>setAction({type:"hide",review:selected})} className="min-h-11 rounded-xl bg-slate-700 text-xs font-black text-white">Hide</button><button onClick={()=>setAction({type:"reject",review:selected})} className="min-h-11 rounded-xl bg-red-700 text-xs font-black text-white">Reject</button></div>}</aside></div>}
    <CustomActionModal open={Boolean(action)} title={action?.type === "reply" ? "Reply to review" : `${action?.type === "publish" ? "Publish" : action?.type === "reject" ? "Reject" : "Hide"} review`} description={action?.type === "reply" ? "Your reply will be stored with this review." : "Add an optional moderation note for the audit trail."} confirmLabel={action?.type === "reply" ? "Save reply" : "Confirm"} tone={action?.type === "reject" ? "danger" : "default"} inputLabel={action?.type === "reply" ? "Reply" : "Moderation note"} inputRequired={action?.type === "reply"} initialValue={action?.type === "reply" ? action.review.ownerReply?.message || "" : action?.review.moderationNote || ""} loading={acting} onClose={()=>setAction(null)} onConfirm={submitAction}/>
  </>;
}
