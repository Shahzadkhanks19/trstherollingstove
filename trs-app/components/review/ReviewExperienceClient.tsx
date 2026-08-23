"use client";

import { faCamera, faCheck, faImage, faStar, faTrash, faUtensils } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

const TAGS = ["Delicious Food", "Fresh Ingredients", "Quick Service", "Great Taste", "Friendly Staff", "Good Portion", "Value for Money", "Hot & Fresh", "Premium Experience", "Clean Packaging"] as const;
type Recommendation = "definitely" | "maybe" | "no";
type CategoryKey = "foodQuality" | "taste" | "service" | "speed" | "packaging";
type Eligibility = { order: { id: string; orderNumber: string; orderMode: "dine_in" | "takeaway"; completedAt: string | null; items: string[] }; alreadyReviewed: boolean; existingReview: { id: string; status: string; createdAt: string } | null };
type ApiResponse<T> = { success: boolean; message: string; data?: T };

const CATEGORIES: Array<{ key: CategoryKey; label: string }> = [
  { key: "foodQuality", label: "Food Quality" }, { key: "taste", label: "Taste" },
  { key: "service", label: "Service" }, { key: "speed", label: "Speed" }, { key: "packaging", label: "Packaging" },
];

function Stars({ value, onChange, label, large = false }: { value: number; onChange: (value: number) => void; label: string; large?: boolean }) {
  return <div className="flex flex-wrap items-center gap-1" role="radiogroup" aria-label={label}>{[1,2,3,4,5].map((star) => <button key={star} type="button" role="radio" aria-checked={value === star} aria-label={`${star} star${star === 1 ? "" : "s"}`} onClick={() => onChange(star)} className={`${large ? "h-12 w-12 text-3xl sm:h-14 sm:w-14" : "h-9 w-9 text-xl"} rounded-full transition hover:scale-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#d7a83d]/30 ${star <= value ? "text-[#d7a83d]" : "text-[#dfd2c1]"}`}><FontAwesomeIcon icon={faStar} /></button>)}</div>;
}

async function compressImage(file: File): Promise<string> {
  if (!(["image/jpeg", "image/png", "image/webp"] as string[]).includes(file.type)) throw new Error("Only JPEG, PNG, and WebP images are supported.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Each original image must be smaller than 8 MB.");
  const bitmap = await createImageBitmap(file); const max = 1100; const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  let quality = 0.78; let result = canvas.toDataURL("image/webp", quality);
  while (result.length > 480_000 && quality > 0.42) { quality -= 0.08; result = canvas.toDataURL("image/webp", quality); }
  if (result.length > 500_000) throw new Error("This image could not be compressed enough. Please choose a smaller photo.");
  return result;
}

export function ReviewExperienceClient() {
  const params = useSearchParams(); const orderReference = params.get("order")?.trim() ?? ""; const reduceMotion = useReducedMotion();
  const galleryRef = useRef<HTMLInputElement>(null); const cameraRef = useRef<HTMLInputElement>(null);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null); const [loading, setLoading] = useState(Boolean(orderReference)); const [error, setError] = useState(orderReference ? "" : "Open this page from a completed order."); const [submitting, setSubmitting] = useState(false); const [submitted, setSubmitted] = useState(false);
  const [rating, setRating] = useState(0); const [categories, setCategories] = useState<Record<CategoryKey, number>>({ foodQuality:0,taste:0,service:0,speed:0,packaging:0 }); const [recommendation, setRecommendation] = useState<Recommendation | "">(""); const [tags, setTags] = useState<string[]>([]); const [comment, setComment] = useState(""); const [images, setImages] = useState<string[]>([]);

  const load = useCallback(async () => { if (!orderReference) return; setLoading(true); setError(""); try { const res = await fetch(`/api/v1/customer/reviews?order=${encodeURIComponent(orderReference)}`, { cache:"no-store" }); const payload = await res.json() as ApiResponse<Eligibility>; if (!res.ok || !payload.success || !payload.data) throw new Error(payload.message || "Unable to load review details."); setEligibility(payload.data); } catch (e) { setError(e instanceof Error ? e.message : "Unable to load review details."); } finally { setLoading(false); } }, [orderReference]);
  useEffect(() => {
    if (!orderReference) return;
    const controller = new AbortController();
    void fetch(`/api/v1/customer/reviews?order=${encodeURIComponent(orderReference)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => ({ response, payload: await response.json() as ApiResponse<Eligibility> }))
      .then(({ response, payload }) => {
        if (!response.ok || !payload.success || !payload.data) throw new Error(payload.message || "Unable to load review details.");
        setEligibility(payload.data);
        setError("");
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load review details.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [orderReference]);
  const visibleCategories = useMemo(() => CATEGORIES.filter((item) => !(item.key === "packaging" && eligibility?.order.orderMode === "dine_in")), [eligibility]);
  const valid = rating > 0 && visibleCategories.every((item) => categories[item.key] > 0) && recommendation !== "";

  const addImages = async (event: ChangeEvent<HTMLInputElement>) => { const files = Array.from(event.target.files ?? []); event.target.value = ""; if (images.length + files.length > 5) { setError("You can upload a maximum of 5 images."); return; } try { setError(""); const compressed = await Promise.all(files.map(compressImage)); setImages((current) => [...current, ...compressed]); } catch (e) { setError(e instanceof Error ? e.message : "Unable to process image."); } };
  const submit = async () => { if (!eligibility || !valid || submitting) return; setSubmitting(true); setError(""); try { const response = await fetch("/api/v1/customer/reviews", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ orderId:eligibility.order.id, rating, categoryRatings:{ ...categories, packaging: eligibility.order.orderMode === "dine_in" ? null : categories.packaging }, recommendation, tags, comment, title:"", images }) }); const payload = await response.json() as ApiResponse<{id:string}>; if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to submit review."); setSubmitted(true); } catch (e) { setError(e instanceof Error ? e.message : "Unable to submit review."); } finally { setSubmitting(false); } };

  if (loading) return <main className="min-h-[70vh] bg-[#fffaf0] p-6"><div className="mx-auto flex min-h-[560px] max-w-5xl items-center justify-center rounded-[2rem] bg-white"><div className="h-14 w-14 animate-spin rounded-full border-4 border-[#ecd9bd] border-t-[#c8102e]" /></div></main>;
  if (error && !eligibility) return <main className="min-h-[70vh] bg-[#fffaf0] px-4 py-16"><section className="mx-auto max-w-2xl rounded-[2rem] border border-[#edc7bd] bg-white p-10 text-center"><FontAwesomeIcon icon={faUtensils} className="text-5xl text-[#c8102e]"/><h1 className="mt-5 text-3xl font-black text-[#5a2418]">Review unavailable</h1><p className="mt-3 text-[#755c51]">{error}</p><button onClick={() => void load()} className="mt-7 rounded-full bg-[#c8102e] px-6 py-3 font-black text-white">Try Again</button></section></main>;
  if (eligibility?.alreadyReviewed) return <main className="min-h-[70vh] bg-[#fffaf0] px-4 py-16"><section className="mx-auto max-w-2xl rounded-[2rem] border border-[#e5cf9f] bg-white p-10 text-center"><FontAwesomeIcon icon={faCheck} className="text-5xl text-[#d7a83d]"/><h1 className="mt-5 text-3xl font-black text-[#5a2418]">Review already submitted</h1><p className="mt-3 text-[#755c51]">Order {eligibility.order.orderNumber} has already been reviewed and is currently {eligibility.existingReview?.status ?? "pending"}.</p><Link href="/customer/dashboard" className="mt-7 inline-flex rounded-full bg-[#c8102e] px-6 py-3 font-black text-white">Continue to Dashboard</Link></section></main>;
  if (submitted) return <main className="min-h-[70vh] bg-[radial-gradient(circle_at_top,#fff0c9,#fffaf0_45%,#fff)] px-4 py-16"><motion.section initial={reduceMotion?false:{opacity:0,scale:.96}} animate={{opacity:1,scale:1}} className="mx-auto max-w-2xl rounded-[2rem] border border-[#e5cf9f] bg-white p-10 text-center shadow-[0_28px_90px_rgba(94,49,17,.13)]"><div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-[#c8102e] text-4xl text-white"><FontAwesomeIcon icon={faCheck}/></div><h1 className="mt-6 text-4xl font-black text-[#5a2418]">Thank you!</h1><p className="mt-3 text-lg text-[#755c51]">Your review was submitted for moderation.</p><p className="mt-4 font-black text-[#b27b16]">+25 TRS Coins may be awarded after approval.</p><div className="mt-8 grid gap-3 sm:grid-cols-3"><Link href="/thank-you" className="rounded-full bg-[#c8102e] px-5 py-3 font-black text-white">Finish</Link><Link href="/customer/dashboard" className="rounded-full border border-[#d9bd83] px-5 py-3 font-black text-[#6c3421]">Dashboard</Link><Link href="/track-order" className="rounded-full border border-[#d9bd83] px-5 py-3 font-black text-[#6c3421]">Track Orders</Link></div></motion.section></main>;

  return <main className="min-h-[70vh] bg-[radial-gradient(circle_at_top,#fff4d2_0,#fffaf0_42%,#fff_100%)] px-4 py-10 sm:px-6 sm:py-16"><motion.form initial={reduceMotion?false:{opacity:0,y:20}} animate={{opacity:1,y:0}} onSubmit={(e)=>{e.preventDefault();void submit();}} className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-[#e5cf9f] bg-white shadow-[0_28px_90px_rgba(94,49,17,.13)]"><header className="bg-gradient-to-br from-[#fff8e7] to-[#fff0eb] px-6 py-10 text-center sm:px-10"><div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#c8102e] text-3xl text-white"><FontAwesomeIcon icon={faStar}/></div><p className="mt-5 text-xs font-black uppercase tracking-[.24em] text-[#b27b16]">{eligibility?.order.orderNumber}</p><h1 className="mt-2 text-4xl font-black tracking-[-.05em] text-[#5a2418]">Rate Your Experience</h1><p className="mt-3 text-[#755c51]">Tell us how your meal was.</p></header><div className="space-y-8 p-5 sm:p-8 lg:p-10">
    <section className="rounded-[1.5rem] border border-[#ead8b1] bg-[#fffaf0] p-6"><h2 className="text-xl font-black text-[#5a2418]">Overall Rating <span className="text-[#c8102e]">*</span></h2><div className="mt-4"><Stars value={rating} onChange={setRating} label="Overall rating" large /></div></section>
    <section><h2 className="text-xl font-black text-[#5a2418]">Category Ratings</h2><div className="mt-4 grid gap-4 md:grid-cols-2">{visibleCategories.map((item)=><div key={item.key} className="rounded-[1.25rem] border border-[#eee0cb] p-5"><p className="font-black text-[#6c3421]">{item.label} <span className="text-[#c8102e]">*</span></p><div className="mt-2"><Stars value={categories[item.key]} onChange={(value)=>setCategories((current)=>({...current,[item.key]:value}))} label={`${item.label} rating`}/></div></div>)}</div></section>
    <section><h2 className="text-xl font-black text-[#5a2418]">Would you recommend TRS?</h2><div className="mt-4 grid gap-3 sm:grid-cols-3">{([['definitely','Definitely'],['maybe','Maybe'],['no','No']] as const).map(([value,label])=><button key={value} type="button" onClick={()=>setRecommendation(value)} className={`rounded-full border px-5 py-3 font-black transition ${recommendation===value?'border-[#c8102e] bg-[#c8102e] text-white':'border-[#d9bd83] bg-white text-[#6c3421]'}`}>{label}</button>)}</div></section>
    <section><h2 className="text-xl font-black text-[#5a2418]">Quick Tags</h2><div className="mt-4 flex flex-wrap gap-2">{TAGS.map((tag)=><button key={tag} type="button" onClick={()=>setTags((current)=>current.includes(tag)?current.filter((item)=>item!==tag):[...current,tag])} className={`rounded-full border px-4 py-2 text-sm font-bold ${tags.includes(tag)?'border-[#d7a83d] bg-[#fff0c9] text-[#7b5108]':'border-[#e5d6c1] text-[#755c51]'}`}>{tag}</button>)}</div></section>
    <section><div className="flex items-end justify-between gap-4"><h2 className="text-xl font-black text-[#5a2418]">Review Comment</h2><span className="text-sm font-bold text-[#997255]">{comment.length}/500</span></div><textarea value={comment} onChange={(e)=>setComment(e.target.value.slice(0,500))} rows={5} placeholder="What did you enjoy most?" className="mt-3 w-full rounded-[1.25rem] border border-[#d9c7ad] bg-[#fffdf8] p-4 text-[#5a2418] outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-[#c8102e]/10"/></section>
    <section><h2 className="text-xl font-black text-[#5a2418]">Upload Photos <span className="text-sm font-medium text-[#997255]">(maximum 5)</span></h2><input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e)=>void addImages(e)} className="hidden"/><input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={(e)=>void addImages(e)} className="hidden"/><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={()=>galleryRef.current?.click()} className="rounded-full border border-[#d9bd83] px-5 py-3 font-black text-[#6c3421]"><FontAwesomeIcon icon={faImage} className="mr-2"/>Gallery</button><button type="button" onClick={()=>cameraRef.current?.click()} className="rounded-full border border-[#d9bd83] px-5 py-3 font-black text-[#6c3421]"><FontAwesomeIcon icon={faCamera} className="mr-2"/>Camera</button></div>{images.length>0&&<div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">{images.map((image,index)=><div key={`${image.slice(-20)}-${index}`} className="relative aspect-square overflow-hidden rounded-xl border border-[#ead8b1]"><Image src={image} alt={`Review upload ${index+1}`} fill unoptimized sizes="(max-width: 640px) 50vw, 20vw" className="object-cover"/><button type="button" onClick={()=>setImages((current)=>current.filter((_,i)=>i!==index))} aria-label={`Remove image ${index+1}`} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/70 text-white"><FontAwesomeIcon icon={faTrash}/></button></div>)}</div>}</section>
    <section className="rounded-[1.5rem] border border-[#efd3cb] bg-[#fffdf8] p-6"><h2 className="text-xl font-black text-[#5a2418]">Review Summary</h2><p className="mt-3 font-bold text-[#755c51]">{rating ? `${rating}/5 stars` : 'Choose your overall rating'} · {recommendation || 'Recommendation pending'}</p>{tags.length>0&&<p className="mt-2 text-sm text-[#8b7469]">{tags.join(' · ')}</p>}{comment&&<p className="mt-3 leading-7 text-[#5a2418]">“{comment}”</p>}<p className="mt-2 text-sm font-bold text-[#997255]">{images.length} photo{images.length===1?'':'s'} attached</p></section>
    {error&&<p role="alert" className="rounded-xl bg-[#fff0ec] p-4 font-bold text-[#a80d25]">{error}</p>}<button type="submit" disabled={!valid||submitting} className="w-full rounded-full bg-[#c8102e] px-6 py-4 text-lg font-black text-white transition hover:bg-[#a80d25] disabled:cursor-not-allowed disabled:opacity-45">{submitting?'Submitting Review…':'Submit Review'}</button>
  </div></motion.form></main>;
}
