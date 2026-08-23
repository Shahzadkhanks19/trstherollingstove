"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCloudArrowUp, faImage, faPhotoFilm, faSpinner, faVideo } from "@fortawesome/free-solid-svg-icons";

type Api<T> = { data: T; message?: string };
export type MediaAsset = { _id: string; url: string; originalName: string; mediaType: "image" | "video"; category: string; sizeBytes: number; altText?: string };

export function MediaPicker({ label, value, onChange, accept = "image", category = "general", required = false }: { label: string; value: string; onChange: (url: string) => void; accept?: "image" | "video" | "all"; category?: string; required?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const parameter = accept === "all" ? "" : `?mediaType=${accept}`;
    const response = await fetch(`/api/v1/admin/media${parameter}`, { cache: "no-store" });
    const json = (await response.json()) as Api<MediaAsset[]>;
    if (response.ok) setAssets(json.data);
  }, [accept]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load, open]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true); setMessage("");
    try {
      const body = new FormData();
      Array.from(files).forEach((file) => body.append("files", file));
      body.append("category", category);
      const response = await fetch("/api/v1/admin/media", { method: "POST", body });
      const json = (await response.json()) as Api<MediaAsset[]>;
      if (!response.ok) throw new Error(json.message || "Upload failed.");
      const first = json.data[0];
      if (first) onChange(first.url);
      setAssets((current) => [...json.data, ...current]);
      setOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally { setUploading(false); if (inputRef.current) inputRef.current.value = ""; }
  }

  const inputAccept = accept === "image" ? "image/jpeg,image/png,image/webp,image/avif" : accept === "video" ? "video/mp4,video/webm" : "image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm";
  return <div className="rounded-2xl border border-[#e8ddd3] bg-white p-4">
    <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black text-[#173044]">{label}{required ? " *" : ""}</p><p className="mt-1 text-[11px] text-[#756960]">Upload from device or choose an existing media file.</p></div><FontAwesomeIcon icon={accept === "video" ? faVideo : faImage} className="text-[#C8102E]"/></div>
    {value && <div className="relative mt-3 aspect-video overflow-hidden rounded-xl bg-[#f5ede6]">{value.match(/\.(mp4|webm)$/i) ? <video src={value} controls className="h-full w-full object-cover"/> : <Image src={value} alt="Selected media preview" fill unoptimized className="object-cover"/>}</div>}
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <button type="button" disabled={uploading} onClick={() => inputRef.current?.click()} className="rounded-xl bg-[#C8102E] px-4 py-3 text-xs font-black text-white disabled:opacity-60"><FontAwesomeIcon icon={uploading ? faSpinner : faCloudArrowUp} spin={uploading} className="mr-2"/>{uploading ? "Uploading" : value ? "Replace from device" : "Upload from device"}</button>
      <button type="button" onClick={() => setOpen((current) => !current)} className="rounded-xl border border-[#d9cbc0] px-4 py-3 text-xs font-black text-[#173044]"><FontAwesomeIcon icon={faPhotoFilm} className="mr-2"/>Choose from library</button>
    </div>
    <input ref={inputRef} type="file" accept={inputAccept} onChange={(event) => void upload(event.target.files)} className="hidden"/>
    {message && <p className="mt-2 text-xs font-bold text-red-700">{message}</p>}
    {open && <div className="mt-4 grid max-h-80 grid-cols-2 gap-3 overflow-y-auto rounded-xl border p-3 sm:grid-cols-3">{assets.map((asset) => <button type="button" key={asset._id} onClick={() => { onChange(asset.url); setOpen(false); }} className="overflow-hidden rounded-xl border text-left focus:outline-none focus:ring-2 focus:ring-[#C8102E]">{asset.mediaType === "image" ? <div className="relative aspect-square"><Image src={asset.url} alt={asset.altText || asset.originalName} fill unoptimized className="object-cover"/></div> : <div className="grid aspect-square place-items-center bg-[#f5ede6] text-2xl text-[#C8102E]"><FontAwesomeIcon icon={faVideo}/></div>}<p className="truncate px-2 py-2 text-[10px] font-bold">{asset.originalName}</p></button>)}{assets.length === 0 && <p className="col-span-full py-6 text-center text-xs text-[#756960]">No media uploaded yet.</p>}</div>}
  </div>;
}
