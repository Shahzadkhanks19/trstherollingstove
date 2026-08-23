"use client";

import { FormEvent, useEffect, useState } from "react";

type ProfilePayload = { user: { name: string; email: string; phone?: string; avatarUrl?: string }; profile: { preferredName?: string; dateOfBirth?: string | null; anniversary?: string | null; dietaryNotes?: string; marketingWhatsAppOptIn?: boolean; marketingEmailOptIn?: boolean; preferredCommunicationChannel?: "whatsapp" | "email" | "phone" | "none" } | null };
type ApiResponse = { success: boolean; message: string; data: ProfilePayload };

export function ProfileForm() {
  const [data, setData] = useState<ProfilePayload | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { void fetch("/api/v1/customer/profile", { cache: "no-store" }).then((r) => r.json()).then((body: ApiResponse) => setData(body.data)); }, []);
  if (!data) return <div className="h-96 animate-pulse rounded-3xl bg-white" />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""), phone: String(form.get("phone") ?? "") || null,
      avatarUrl: String(form.get("avatarUrl") ?? ""),
      profile: {
        preferredName: String(form.get("preferredName") ?? ""), dateOfBirth: String(form.get("dateOfBirth") ?? "") || null,
        anniversary: String(form.get("anniversary") ?? "") || null, dietaryNotes: String(form.get("dietaryNotes") ?? ""),
        preferredCommunicationChannel: String(form.get("preferredCommunicationChannel") ?? "none"),
        marketingWhatsAppOptIn: form.get("marketingWhatsAppOptIn") === "on", marketingEmailOptIn: form.get("marketingEmailOptIn") === "on",
      },
    };
    try {
      const response = await fetch("/api/v1/customer/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = (await response.json()) as ApiResponse;
      if (!response.ok) throw new Error(body.message);
      setData(body.data); setMessage("Profile updated successfully.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Profile update failed."); } finally { setSaving(false); }
  }

  const profile = data.profile ?? {};
  const dateValue = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 10) : "";
  const input = "mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#C8102E] focus:ring-4 focus:ring-[#C8102E]/10";

  return <form onSubmit={submit} className="space-y-6 rounded-3xl border border-black/5 bg-white p-5 shadow-sm md:p-8">
    <div><h1 className="text-2xl font-black">My profile</h1><p className="mt-1 text-sm text-black/50">Manage your personal details and communication preferences.</p></div>
    <div className="grid gap-5 md:grid-cols-2">
      <label className="text-sm font-bold">Full name<input name="name" defaultValue={data.user.name} required minLength={2} className={input} /></label>
      <label className="text-sm font-bold">Preferred name<input name="preferredName" defaultValue={profile.preferredName ?? ""} className={input} /></label>
      <label className="text-sm font-bold">Email<input value={data.user.email} disabled className={`${input} bg-black/5 text-black/45`} /></label>
      <label className="text-sm font-bold">Phone<input name="phone" defaultValue={data.user.phone ?? ""} inputMode="numeric" pattern="[6-9][0-9]{9}" className={input} /></label>
      <label className="text-sm font-bold">Date of birth<input type="date" name="dateOfBirth" defaultValue={dateValue(profile.dateOfBirth)} className={input} /></label>
      <label className="text-sm font-bold">Anniversary<input type="date" name="anniversary" defaultValue={dateValue(profile.anniversary)} className={input} /></label>
      <label className="text-sm font-bold md:col-span-2">Avatar URL<input type="url" name="avatarUrl" defaultValue={data.user.avatarUrl ?? ""} className={input} /></label>
      <label className="text-sm font-bold md:col-span-2">Dietary preferences or allergies<textarea name="dietaryNotes" defaultValue={profile.dietaryNotes ?? ""} rows={4} maxLength={500} className={input} /></label>
      <label className="text-sm font-bold">Preferred contact<select name="preferredCommunicationChannel" defaultValue={profile.preferredCommunicationChannel ?? "none"} className={input}><option value="none">No preference</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="phone">Phone</option></select></label>
      <div className="space-y-3 pt-2 md:pt-7"><label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" name="marketingWhatsAppOptIn" defaultChecked={profile.marketingWhatsAppOptIn ?? false} className="h-4 w-4 accent-[#C8102E]" />WhatsApp offers</label><label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" name="marketingEmailOptIn" defaultChecked={profile.marketingEmailOptIn ?? false} className="h-4 w-4 accent-[#C8102E]" />Email offers</label></div>
    </div>
    <div className="flex flex-wrap items-center gap-4"><button disabled={saving} className="rounded-xl bg-[#C8102E] px-6 py-3 font-extrabold text-white disabled:opacity-60">{saving ? "Saving…" : "Save profile"}</button>{message ? <p className="text-sm font-bold text-black/60">{message}</p> : null}</div>
  </form>;
}
