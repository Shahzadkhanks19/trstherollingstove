"use client";

import { useCallback, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRotateRight, faGift, faMagnifyingGlass, faPeopleArrows } from "@fortawesome/free-solid-svg-icons";
import { PageHeader, SectionCard, StatusBadge } from "@/components/admin/AdminPrimitives";
import { CustomActionModal } from "@/components/admin/CustomActionModal";

type Person = { name?: string; email?: string; phone?: string };
type Referral = { _id: string; referralCode: string; status: string; referrerCustomerId: Person; referredCustomerId: Person; referrerRewardCoins: number; friendCouponAmount: number; createdAt: string; fraudFlags: string[] };
type Result = { data?: { referrals: Referral[]; stats: Record<string, number> }; message?: string };

async function readResult(response: Response): Promise<Result> {
  return response.json().catch(() => ({ message: "The server returned an invalid response." })) as Promise<Result>;
}

export function AdminReferralsClient() {
  const [rows, setRows] = useState<Referral[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [action, setAction] = useState<{ row: Referral; status: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/admin/referrals?limit=100&search=${encodeURIComponent(search)}&status=${status}`, { cache: "no-store" });
      const result = await readResult(response);
      if (!response.ok || !result.data) throw new Error(result.message || "Unable to load referrals.");
      setRows(result.data.referrals);
      setStats(result.data.stats);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load referrals.");
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function update(reason: string) {
    if (!action || saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/v1/admin/referrals/${action.row._id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: action.status, rejectionReason: reason }),
      });
      const result = await readResult(response);
      if (!response.ok) throw new Error(result.message || "Unable to update referral.");
      setAction(null);
      setNotice(result.message || "Referral updated.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update referral.");
    } finally {
      setSaving(false);
    }
  }

  return <div>
    <PageHeader eyebrow="Growth" title="Referrals" description="Track invite codes, first-order conversion, reward eligibility and suspicious activity." />
    {error && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"><span>{error}</span><button type="button" onClick={() => void load()} disabled={loading} className="rounded-lg border border-red-300 px-3 py-2 text-xs font-black disabled:opacity-50"><FontAwesomeIcon icon={faArrowRotateRight} className="mr-2" />Retry</button></div>}
    {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</p>}
    <div className="mb-5 grid gap-3 sm:grid-cols-4">{[["Total", Object.values(stats).reduce((a, b) => a + b, 0)], ["Rewarded", stats.rewarded || 0], ["Pending", (stats.signed_up || 0) + (stats.first_order_pending || 0)], ["Under review", stats.under_review || 0]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border bg-white p-4"><p className="text-xs font-black text-slate-500">{label}</p><p className="mt-2 text-3xl font-black text-[#173044]">{value}</p></div>)}</div>
    <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_220px]"><label className="flex items-center gap-2 rounded-xl border bg-white px-3"><FontAwesomeIcon icon={faMagnifyingGlass} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search referral code" className="w-full py-3 outline-none" /></label><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border bg-white px-3"><option value="all">All statuses</option>{["signed_up", "first_order_pending", "order_completed", "rewarded", "under_review", "rejected", "expired"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></div>
    <SectionCard title="Referral activity" subtitle={loading ? "Loading…" : `${rows.length} records`}>
      {loading && rows.length === 0 ? <div role="status" className="space-y-3">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)}</div> : <div className="space-y-3">{rows.map((row) => <article key={row._id} className="rounded-2xl border p-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex flex-wrap gap-2"><span className="rounded-lg bg-[#fff0e8] px-2 py-1 font-mono text-xs font-black text-[#C8102E]">{row.referralCode}</span><StatusBadge value={row.status} />{row.fraudFlags?.length > 0 && <span className="rounded-full bg-red-50 px-2 py-1 text-[9px] font-black text-red-700">{row.fraudFlags.length} fraud flag(s)</span>}</div><p className="mt-3 text-sm font-black text-[#173044]">{row.referrerCustomerId?.name || "Unknown referrer"} → {row.referredCustomerId?.name || "Unknown customer"}</p><p className="mt-1 text-xs text-slate-500">Reward: {row.referrerRewardCoins} coins · Friend benefit: ₹{row.friendCouponAmount}</p></div><div className="flex flex-wrap gap-2"><button disabled={saving} onClick={() => setAction({ row, status: "rewarded" })} className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white disabled:opacity-50"><FontAwesomeIcon icon={faGift} className="mr-2" />Mark rewarded</button><button disabled={saving} onClick={() => setAction({ row, status: "under_review" })} className="rounded-xl border px-3 py-2 text-xs font-black disabled:opacity-50">Review</button><button disabled={saving} onClick={() => setAction({ row, status: "rejected" })} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-black text-red-700 disabled:opacity-50">Reject</button></div></div></article>)}{!loading && !error && !rows.length && <p className="py-10 text-center text-sm text-slate-500"><FontAwesomeIcon icon={faPeopleArrows} className="mr-2" />No referrals match the current filters.</p>}</div>}
    </SectionCard>
    <CustomActionModal open={!!action} title="Update referral" description={`Change this referral to ${action?.status.replaceAll("_", " ")}.`} inputLabel={action?.status === "rejected" ? "Rejection reason" : undefined} inputRequired={action?.status === "rejected"} confirmLabel="Update" loading={saving} onClose={() => { if (!saving) setAction(null); }} onConfirm={update} />
  </div>;
}
