"use client";

import type { FormEvent, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFloppyDisk, faXmark } from "@fortawesome/free-solid-svg-icons";

export function AdminMenuEditorShell({open,editing,acting,error,onClose,onSubmit,children}:{open:boolean;editing:boolean;acting:boolean;error:string;onClose:()=>void;onSubmit:(event:FormEvent<HTMLFormElement>)=>void;children:ReactNode}) {
 return <AnimatePresence>{open&&<><motion.button aria-label="Close menu item editor" onClick={onClose} className="fixed inset-0 z-[110] bg-black/45 backdrop-blur-sm" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}/><motion.aside initial={{x:"100%"}} animate={{x:0}} exit={{x:"100%"}} transition={{type:"spring",damping:28,stiffness:280}} className="fixed inset-x-0 bottom-0 z-[111] max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] bg-[#fffdf9] shadow-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:max-w-2xl sm:rounded-none"><form onSubmit={onSubmit}>
  <div className="sticky top-0 z-10 flex min-w-0 items-center justify-between gap-3 border-b border-[#e8ddd3] bg-[#fffdf9]/95 px-5 py-4 backdrop-blur"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#C8102E]">Catalog editor</p><h2 className="mt-1 truncate text-lg font-black sm:text-xl text-[#122b3c]">{editing?"Edit menu item":"Create menu item"}</h2></div><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-[#e5d9cf]"><FontAwesomeIcon icon={faXmark}/></button></div>
  <div className="space-y-5 p-4 sm:space-y-6 sm:p-6">{error&&<div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</div>}{children}</div>
  <div className="sticky bottom-0 grid grid-cols-2 gap-3 border-t sm:flex sm:justify-end border-[#e8ddd3] bg-[#fffdf9]/95 px-5 py-4 backdrop-blur"><button type="button" onClick={onClose} className="h-11 w-full rounded-2xl border sm:w-auto border-[#e5d9cf] px-5 text-xs font-black text-[#122b3c]">Cancel</button><button disabled={acting} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#C8102E] sm:w-auto px-5 text-xs font-black text-white disabled:opacity-60"><FontAwesomeIcon icon={faFloppyDisk}/>{acting?"Saving…":"Save item"}</button></div>
 </form></motion.aside></>}</AnimatePresence>;
}
