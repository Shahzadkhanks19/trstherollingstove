"use client";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faBell, faChevronDown, faKey, faMagnifyingGlass, faRightFromBracket } from "@fortawesome/free-solid-svg-icons";

type Props = { name: string; role: string; onMenu: () => void };
export function AdminTopbar({ name, role, onMenu }: Props) {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  async function logout() {
    setLoggingOut(true);
    try { await fetch("/api/v1/auth/logout", { method: "POST" }); } finally { window.location.assign("/admin/login"); }
  }
  return <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b border-[#eadfd5] bg-[#fffdf9]/95 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
    <div className="flex items-center gap-3">
      <button onClick={onMenu} aria-label="Open navigation" className="grid h-11 w-11 place-items-center rounded-xl border border-[#e7dbd0] bg-white text-[#18232d] lg:hidden"><FontAwesomeIcon icon={faBars} /></button>
      <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#C8102E]">The Rolling Stove</p><p className="text-sm font-extrabold text-[#152633] sm:text-base">Command Centre</p></div>
    </div>
    <div className="flex items-center gap-2 sm:gap-3">
      <label className="hidden h-11 w-[min(28vw,300px)] items-center gap-3 rounded-xl border border-[#e7dbd0] bg-white px-4 xl:flex"><FontAwesomeIcon icon={faMagnifyingGlass} className="text-[#9d9188]"/><input aria-label="Search admin" placeholder="Search orders, customers..." className="w-full bg-transparent text-xs font-semibold outline-none placeholder:text-[#aaa098]" /></label>
      <button aria-label="Notifications" className="relative grid h-11 w-11 place-items-center rounded-xl border border-[#e7dbd0] bg-white text-[#263844]"><FontAwesomeIcon icon={faBell}/><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#C8102E] ring-2 ring-white"/></button>
      <div className="relative"><button onClick={() => setOpen((value) => !value)} aria-expanded={open} className="flex h-11 items-center gap-2 rounded-xl border border-[#e7dbd0] bg-white px-2 sm:px-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#132c3d] text-xs font-black text-white">{name.slice(0,1).toUpperCase()}</span><span className="hidden text-left md:block"><b className="block max-w-28 truncate text-xs text-[#18232d]">{name}</b><span className="block text-[9px] font-bold uppercase tracking-wider text-[#998d84]">{role.replaceAll("_", " ")}</span></span><FontAwesomeIcon icon={faChevronDown} className="hidden h-3 text-[#998d84] sm:block"/></button>
      {open ? <div className="absolute right-0 mt-2 w-52 rounded-xl border border-[#e7dbd0] bg-white p-2 shadow-xl"><a href="/admin/security" onClick={() => setOpen(false)} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-xs font-black text-[#18232d] hover:bg-[#f5efe9]"><FontAwesomeIcon icon={faKey} className="h-4 text-[#C8102E]" />Change password</a><div className="my-1 border-t border-[#eee4dc]" /><button onClick={logout} disabled={loggingOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-xs font-black text-[#A50E27] hover:bg-[#fff1f1] disabled:opacity-60"><FontAwesomeIcon icon={faRightFromBracket} className="h-4" />{loggingOut ? "Signing out..." : "Logout"}</button></div> : null}</div>
    </div>
  </header>;
}
