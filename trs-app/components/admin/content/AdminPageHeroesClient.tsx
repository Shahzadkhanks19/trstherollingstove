"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/admin/AdminPrimitives";
import { MediaPicker } from "@/components/admin/media/MediaPicker";

type Hero = {
  pageKey: string;
  pageName: string;
  group: string;
  desktopImageUrl: string;
  mobileImageUrl: string;
  imageAlt: string;
  overlayOpacity: number;
  focalPointX: number;
  focalPointY: number;
  isActive: boolean;
};

type Api<T> = { data: T; message?: string };

export function AdminPageHeroesClient() {
  const [rows, setRows] = useState<Hero[]>([]);
  const [selectedKey, setSelectedKey] = useState("home");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/admin/page-heroes", { cache: "no-store", credentials: "include" });
      const json = (await response.json()) as Api<Hero[]>;
      if (!response.ok) throw new Error(json.message || "Unable to load page hero media.");
      setRows(json.data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load page hero media.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const selected = useMemo(() => rows.find((row) => row.pageKey === selectedKey), [rows, selectedKey]);

  function update(patch: Partial<Hero>) {
    setRows((current) => current.map((row) => row.pageKey === selectedKey ? { ...row, ...patch } : row));
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/v1/admin/page-heroes/${selected.pageKey}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(selected),
      });
      const json = (await response.json()) as Api<unknown>;
      if (!response.ok) throw new Error(json.message || "Unable to save hero media.");
      setMessage(json.message || "Hero media saved and published.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save hero media.");
    } finally {
      setSaving(false);
    }
  }

  const groups = ["Main", "Ordering", "Support", "Legal", "System"];

  return (
    <div>
      <PageHeader
        eyebrow="Content"
        title="Page Hero Media"
        description="Replace the existing hero image or media placeholder on each page. These uploads are displayed inside the page's current hero image slot, not as section backgrounds."
      />
      {message && <p className="mb-4 rounded-xl bg-[#fff0e8] px-4 py-3 text-sm font-semibold text-[#8d1b2a]">{message}</p>}
      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-[#e8ddd3] bg-white p-4">
          {groups.map((group) => (
            <div key={group} className="mb-5 last:mb-0">
              <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-[.18em] text-[#9a8c80]">{group}</p>
              <div className="space-y-1">
                {rows.filter((row) => row.group === group).map((row) => (
                  <button key={row.pageKey} type="button" onClick={() => setSelectedKey(row.pageKey)} className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-black ${selectedKey === row.pageKey ? "bg-[#C8102E] text-white" : "hover:bg-[#fff6ef]"}`}>
                    <span>{row.pageName}</span>
                    <span className={`h-2.5 w-2.5 rounded-full ${row.desktopImageUrl && row.isActive ? "bg-emerald-500" : "bg-[#d6c9bd]"}`} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        {selected && (
          <section className="rounded-3xl border border-[#e8ddd3] bg-[#fffdf9] p-5 sm:p-7">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[.16em] text-[#C8102E]">{selected.group}</p>
                <h2 className="mt-1 text-2xl font-black text-[#173044]">{selected.pageName} hero image</h2>
                <p className="mt-2 text-xs font-semibold text-[#756960]">This image replaces the current hero image/placeholder while preserving the existing hero layout and text.</p>
              </div>
              <label className="flex items-center gap-3 text-sm font-black">
                <input type="checkbox" checked={selected.isActive} onChange={(event) => update({ isActive: event.target.checked })} className="h-5 w-5" />
                Use uploaded image
              </label>
            </div>

            <div className="mb-6 overflow-hidden rounded-2xl border bg-[#f4ece5]">
              <div className="relative aspect-[16/9]">
                {selected.desktopImageUrl ? (
                  <Image src={selected.desktopImageUrl} alt={selected.imageAlt || selected.pageName} fill unoptimized className="object-cover" style={{ objectPosition: `${selected.focalPointX}% ${selected.focalPointY}%` }} />
                ) : (
                  <div className="grid h-full place-items-center px-6 text-center text-sm font-bold text-[#8c7e72]">No replacement image uploaded. The page keeps its existing hardcoded image or media placeholder.</div>
                )}
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <MediaPicker label="Desktop hero-slot image (recommended 1600 × 1200)" value={selected.desktopImageUrl} onChange={(desktopImageUrl) => update({ desktopImageUrl })} category={`page-heroes-${selected.pageKey}`} />
              <MediaPicker label="Mobile hero-slot image (optional, recommended 1080 × 1350)" value={selected.mobileImageUrl} onChange={(mobileImageUrl) => update({ mobileImageUrl })} category={`page-heroes-${selected.pageKey}-mobile`} />
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <label className="text-xs font-black text-[#173044] sm:col-span-3">Image alt text<input value={selected.imageAlt} onChange={(event) => update({ imageAlt: event.target.value })} className="mt-2 h-12 w-full rounded-xl border bg-white px-4 text-sm font-medium" /></label>
              <label className="text-xs font-black text-[#173044]">Horizontal focus: {selected.focalPointX}%<input type="range" min="0" max="100" value={selected.focalPointX} onChange={(event) => update({ focalPointX: Number(event.target.value) })} className="mt-3 w-full" /></label>
              <label className="text-xs font-black text-[#173044]">Vertical focus: {selected.focalPointY}%<input type="range" min="0" max="100" value={selected.focalPointY} onChange={(event) => update({ focalPointY: Number(event.target.value) })} className="mt-3 w-full" /></label>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => void save()} disabled={saving} className="rounded-xl bg-[#C8102E] px-5 py-3 text-xs font-black uppercase text-white disabled:opacity-50">{saving ? "Saving..." : "Save & publish"}</button>
              <button type="button" onClick={() => update({ desktopImageUrl: "", mobileImageUrl: "" })} className="rounded-xl border px-5 py-3 text-xs font-black uppercase text-[#8d1b2a]">Remove replacement</button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
