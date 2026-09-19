"use client";

/* eslint-disable @next/next/no-img-element */

import type { RefObject } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faImage, faUpload } from "@fortawesome/free-solid-svg-icons";

export function AdminMenuEditorImage({imageUrl,inputRef,uploading,onUpload,onRemove}:{imageUrl:string;inputRef:RefObject<HTMLInputElement|null>;uploading:boolean;onUpload:(file:File)=>void;onRemove:()=>void}) {
  return <div className="overflow-hidden rounded-[22px] border border-dashed border-[#d9cbc0] bg-white">
    <div className="grid min-h-48 place-items-center bg-[#fff3ec]">{imageUrl?<img src={imageUrl} alt="Menu item preview" className="h-48 w-full object-cover"/>:<div className="text-center text-[#8c7f76]"><FontAwesomeIcon icon={faImage} className="h-9"/><p className="mt-2 text-xs font-bold">No menu image selected</p></div>}</div>
    <div className="flex flex-wrap gap-2 p-3"><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={e=>{const file=e.target.files?.[0];if(file)onUpload(file)}}/><button type="button" onClick={()=>inputRef.current?.click()} disabled={uploading} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#122b3c] px-4 text-xs font-black text-white disabled:opacity-50"><FontAwesomeIcon icon={faUpload}/>{uploading?"Uploading…":"Upload from device"}</button>{imageUrl&&<button type="button" onClick={onRemove} className="h-10 rounded-xl border border-red-100 px-4 text-xs font-black text-red-600">Remove</button>}</div>
    <p className="px-3 pb-3 text-[11px] font-semibold text-[#81746b]">JPG, PNG, WebP or AVIF · Maximum 5 MB</p>
  </div>;
}
