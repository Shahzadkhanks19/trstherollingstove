"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell, faRotate } from "@fortawesome/free-solid-svg-icons";
import type { GroupedItem, KitchenTicket, TicketStatus } from "@/components/admin/kds/kds.types";
import { TicketCard } from "@/components/admin/kds/KdsTicketCard";

export function KdsQueue({loading,groupedView,groupedItems,tickets,now,actingTicketId,onStatus,onDetails,onAddTime}:{loading:boolean;groupedView:boolean;groupedItems:GroupedItem[];tickets:KitchenTicket[];now:number;actingTicketId:string;onStatus:(ticket:KitchenTicket,status:TicketStatus)=>void;onDetails:(ticket:KitchenTicket)=>void;onAddTime:(ticket:KitchenTicket,minutes:number)=>void}){
 return <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">{loading?<LoadingState/>:groupedView?groupedItems.length>0?<GroupedItems items={groupedItems}/>:<EmptyState/>:tickets.length>0?<motion.div layout className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"><AnimatePresence mode="popLayout">{tickets.map(ticket=><TicketCard key={ticket._id} ticket={ticket} now={now} acting={actingTicketId===ticket._id} onStatus={onStatus} onDetails={onDetails} onAddTime={onAddTime}/>)}</AnimatePresence></motion.div>:<EmptyState/>}</main>
}

function GroupedItems({items}:{items:GroupedItem[]}){return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{items.map(item=><motion.article layout key={item.key} className="rounded-[24px] border-2 border-white/10 bg-[#fffdf9] p-5 text-[#173044] shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-4xl font-black text-[#C8102E]">×{item.quantity}</p><h2 className="mt-2 text-2xl font-black leading-tight">{item.name}</h2></div><span className="rounded-xl bg-[#173044] px-3 py-2 text-xs font-black text-white">{item.tickets.length} tickets</span></div>{item.modifiers.length>0&&<div className="mt-4 rounded-2xl bg-[#f4ede6] p-4">{item.modifiers.map(modifier=><p key={modifier} className="font-bold">+ {modifier}</p>)}</div>}{item.notes.length>0&&<div className="mt-3 rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-red-800">{[...new Set(item.notes)].map(note=><p key={note} className="font-black">{note}</p>)}</div>}<p className="mt-4 text-sm font-black text-[#71645b]">Orders: {item.tickets.map(ticket=>`#${ticket}`).join(", ")}</p></motion.article>)}</div>}

function LoadingState(){return <div className="grid min-h-[55vh] place-items-center text-center"><div><FontAwesomeIcon icon={faRotate} className="text-4xl animate-spin text-[#E8A53A]"/><p className="mt-4 text-lg font-black">Loading kitchen queue…</p></div></div>}
function EmptyState(){return <div className="grid min-h-[55vh] place-items-center text-center"><div><span className="mx-auto grid h-20 w-20 place-items-center rounded-[28px] bg-emerald-500/15 text-3xl text-emerald-300"><FontAwesomeIcon icon={faBell}/></span><h2 className="mt-5 text-2xl font-black">Kitchen queue is clear</h2><p className="mt-2 font-bold text-white/50">New tickets will appear automatically.</p></div></div>}
