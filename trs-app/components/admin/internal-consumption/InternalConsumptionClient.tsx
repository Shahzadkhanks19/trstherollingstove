"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRotateRight, faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { PageHeader, SectionCard, StatusBadge } from "@/components/admin/AdminPrimitives";

type SaleType = "staff_meal" | "family_meal" | "complimentary" | "food_wastage" | "kitchen_test";
type Staff = { id: string; name: string; email: string; profile: { employeeCode?: string; department?: string; mealEligible?: boolean; dailyMealLimit?: number; weeklyMealLimit?: number; monthlyMealLimit?: number; yearlyMealLimit?: number; unlimitedMeals?: boolean; mealSuspendedUntil?: string | null; mealSuspensionReason?: string; requireManagerApprovalOnLimit?: boolean } | null };
type Family = { _id: string; name: string; relationship: string; phone: string; notes: string; isActive: boolean };
type Reason = { _id: string; saleType: SaleType; name: string; isActive: boolean; sortOrder: number };
type Summary = { _id: SaleType; orders: number; menuValue: number };

const input = "h-11 w-full rounded-xl border border-[#e1d6cd] bg-white px-3 text-sm font-semibold text-[#173044] outline-none focus:border-[#C8102E]";
const labels: Record<SaleType, string> = { staff_meal: "Staff Meal", family_meal: "Family Meal", complimentary: "Complimentary", food_wastage: "Food Wastage", kitchen_test: "Kitchen Testing" };

export function InternalConsumptionClient() {
  const [tab, setTab] = useState<"dashboard" | "staff" | "family" | "reasons">("dashboard");
  const [staff, setStaff] = useState<Staff[]>([]);
  const [family, setFamily] = useState<Family[]>([]);
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [summary, setSummary] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [familyForm, setFamilyForm] = useState({ name: "", relationship: "", phone: "", notes: "", isActive: true });
  const [reasonForm, setReasonForm] = useState<{ saleType: SaleType; name: string; sortOrder: number }>({ saleType: "staff_meal", name: "", sortOrder: 0 });

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/v1/admin/internal-consumption", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to load internal consumption.");
      setStaff(payload.data.staff); setFamily(payload.data.family); setReasons(payload.data.reasons); setSummary(payload.data.summary);
    } catch (value) { setError(value instanceof Error ? value.message : "Unable to load internal consumption."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  async function request(options: RequestInit, query = "") {
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/v1/admin/internal-consumption${query}`, options);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Request failed.");
      setNotice(payload.message); await load();
    } catch (value) { setError(value instanceof Error ? value.message : "Request failed."); }
    finally { setSaving(false); }
  }

  const summaryMap = useMemo(() => new Map(summary.map((row) => [row._id, row])), [summary]);
  const total = summary.reduce((acc, row) => ({ orders: acc.orders + row.orders, value: acc.value + row.menuValue }), { orders: 0, value: 0 });

  return <div className="space-y-6">
    <PageHeader eyebrow="Operations" title="Internal Consumption" description="Track staff, family, complimentary, testing and wastage orders without inflating revenue." actions={<button onClick={() => void load()} className="rounded-xl border px-4 py-2 text-xs font-black"><FontAwesomeIcon icon={faArrowRotateRight} className="mr-2"/>Refresh</button>} />
    <div className="flex flex-wrap gap-2">{(["dashboard","staff","family","reasons"] as const).map((value) => <button key={value} onClick={() => setTab(value)} className={`rounded-xl px-4 py-2 text-xs font-black capitalize ${tab === value ? "bg-[#173044] text-white" : "border bg-white"}`}>{value}</button>)}</div>
    {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
    {notice && <p className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{notice}</p>}
    {loading ? <SectionCard><p className="py-10 text-center font-bold text-slate-400">Loading…</p></SectionCard> : null}

    {!loading && tab === "dashboard" && <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><article className="rounded-[24px] bg-[#173044] p-5 text-white"><p className="text-xs font-black uppercase tracking-widest text-white/60">Today</p><p className="mt-3 text-3xl font-black">{total.orders} orders</p><p className="mt-1 text-sm font-bold text-[#E8A53A]">Menu value ₹{total.value.toFixed(2)}</p></article>{Object.entries(labels).map(([key,label]) => { const row = summaryMap.get(key as SaleType); return <article key={key} className="rounded-[24px] border bg-white p-5"><p className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</p><p className="mt-3 text-2xl font-black text-[#173044]">{row?.orders ?? 0}</p><p className="text-sm font-bold text-[#C8102E]">₹{(row?.menuValue ?? 0).toFixed(2)}</p></article>})}</div>
      <SectionCard><h2 className="text-lg font-black">Accounting treatment</h2><p className="mt-2 text-sm leading-6 text-slate-600">These orders retain menu value and inventory movement while recorded revenue remains ₹0. They do not earn or redeem TRS Coins and cannot use coupons.</p></SectionCard>
    </>}

    {!loading && tab === "staff" && <SectionCard><div className="mb-5"><h2 className="text-lg font-black">Staff meal eligibility & limits</h2><p className="text-sm text-slate-500">Limits are stored against the existing staff profile; no duplicate employee directory is created.</p></div><div className="space-y-3">{staff.map((member) => {
      const profile = member.profile; const state = { mealEligible: profile?.mealEligible ?? true, dailyMealLimit: profile?.dailyMealLimit ?? 2, monthlyMealLimit: profile?.monthlyMealLimit ?? 60, requireManagerApprovalOnLimit: profile?.requireManagerApprovalOnLimit ?? true };
      return <form key={member.id} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void request({ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ action:"staff.settings", data:{ userId:member.id, mealEligible:data.get("mealEligible") === "on", dailyMealLimit:Number(data.get("dailyMealLimit")), weeklyMealLimit:profile?.weeklyMealLimit ?? 14, monthlyMealLimit:Number(data.get("monthlyMealLimit")), yearlyMealLimit:profile?.yearlyMealLimit ?? 720, unlimitedMeals:profile?.unlimitedMeals ?? false, mealSuspendedUntil:profile?.mealSuspendedUntil ?? null, mealSuspensionReason:profile?.mealSuspensionReason ?? "", requireManagerApprovalOnLimit:data.get("requireManagerApprovalOnLimit") === "on" } }) }); }} className="grid gap-3 rounded-2xl border p-4 lg:grid-cols-[1.5fr_.7fr_.7fr_auto_auto] lg:items-end"><div><p className="font-black">{member.name}</p><p className="text-xs text-slate-500">{profile?.employeeCode || member.email} · {profile?.department || "other"}</p></div><label className="text-xs font-black">Daily limit<input name="dailyMealLimit" type="number" min="0" max="20" defaultValue={state.dailyMealLimit} className={`${input} mt-2`}/></label><label className="text-xs font-black">Monthly limit<input name="monthlyMealLimit" type="number" min="0" max="500" defaultValue={state.monthlyMealLimit} className={`${input} mt-2`}/></label><div className="space-y-2 text-xs font-bold"><label className="flex gap-2"><input name="mealEligible" type="checkbox" defaultChecked={state.mealEligible}/>Meal eligible</label><label className="flex gap-2"><input name="requireManagerApprovalOnLimit" type="checkbox" defaultChecked={state.requireManagerApprovalOnLimit}/>Approval after limit</label></div><button disabled={saving || !profile} className="h-11 rounded-xl bg-[#173044] px-4 text-xs font-black text-white disabled:opacity-40">Save</button></form>
    })}</div></SectionCard>}

    {!loading && tab === "family" && <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><SectionCard><h2 className="text-lg font-black">Add family member</h2><form onSubmit={(event) => { event.preventDefault(); void request({ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ action:"family.create", data:familyForm }) }).then(() => setFamilyForm({ name:"", relationship:"", phone:"", notes:"", isActive:true })); }} className="mt-4 space-y-3">{(["name","relationship","phone"] as const).map((key)=><label key={key} className="block text-xs font-black capitalize">{key}<input required={key === "name"} value={familyForm[key]} onChange={(e)=>setFamilyForm({...familyForm,[key]:e.target.value})} className={`${input} mt-2`}/></label>)}<label className="block text-xs font-black">Notes<textarea value={familyForm.notes} onChange={(e)=>setFamilyForm({...familyForm,notes:e.target.value})} className="mt-2 min-h-24 w-full rounded-xl border p-3"/></label><button disabled={saving} className="h-11 rounded-xl bg-[#C8102E] px-5 text-xs font-black text-white"><FontAwesomeIcon icon={faPlus} className="mr-2"/>Add member</button></form></SectionCard><SectionCard><h2 className="text-lg font-black">Family directory</h2><div className="mt-4 space-y-3">{family.map((member)=><article key={member._id} className="flex items-center justify-between rounded-2xl border p-4"><div><p className="font-black">{member.name}</p><p className="text-xs text-slate-500">{member.relationship || "Relationship not set"}{member.phone ? ` · ${member.phone}` : ""}</p></div><div className="flex items-center gap-3"><StatusBadge tone={member.isActive ? "success" : "neutral"}>{member.isActive ? "Active" : "Inactive"}</StatusBadge><button onClick={() => void request({method:"DELETE"}, `?entity=family&id=${member._id}`)} className="grid h-9 w-9 place-items-center rounded-lg border text-red-700"><FontAwesomeIcon icon={faTrash}/></button></div></article>)}</div></SectionCard></div>}

    {!loading && tab === "reasons" && <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><SectionCard><h2 className="text-lg font-black">Add reason</h2><form onSubmit={(event)=>{event.preventDefault();void request({method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"reason.create",data:reasonForm})}).then(()=>setReasonForm({...reasonForm,name:""}));}} className="mt-4 space-y-3"><label className="block text-xs font-black">Order type<select value={reasonForm.saleType} onChange={(e)=>setReasonForm({...reasonForm,saleType:e.target.value as SaleType})} className={`${input} mt-2`}>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label className="block text-xs font-black">Reason<input required value={reasonForm.name} onChange={(e)=>setReasonForm({...reasonForm,name:e.target.value})} className={`${input} mt-2`}/></label><label className="block text-xs font-black">Sort order<input type="number" min="0" value={reasonForm.sortOrder} onChange={(e)=>setReasonForm({...reasonForm,sortOrder:Number(e.target.value)})} className={`${input} mt-2`}/></label><button disabled={saving} className="h-11 rounded-xl bg-[#C8102E] px-5 text-xs font-black text-white"><FontAwesomeIcon icon={faPlus} className="mr-2"/>Add reason</button></form></SectionCard><SectionCard><h2 className="text-lg font-black">Reason templates</h2><div className="mt-4 space-y-4">{Object.entries(labels).map(([type,label])=><section key={type}><h3 className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">{label}</h3><div className="flex flex-wrap gap-2">{reasons.filter((reason)=>reason.saleType===type).map((reason)=><span key={reason._id} className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-2 text-xs font-black">{reason.name}<button onClick={()=>void request({method:"DELETE"},`?entity=reason&id=${reason._id}`)} className="text-red-600" aria-label={`Delete ${reason.name}`}><FontAwesomeIcon icon={faTrash}/></button></span>)}</div></section>)}</div></SectionCard></div>}
  </div>;
}
