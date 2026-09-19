"use client";

import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChair, faCheck, faClock, faFireBurner, faHand, faMotorcycle, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import type { KitchenTicket, TicketStatus } from "@/components/admin/kds/kds.types";
import { SPECIAL_NOTE_PATTERN, formatElapsed, getTicketStart, getTimerTone, isNewStatus } from "@/components/admin/kds/kds.utils";

export function TicketCard({
  ticket,
  now,
  acting,
  onStatus,
  onDetails,
  onAddTime,
}: {
  ticket: KitchenTicket;
  now: number;
  acting: boolean;
  onStatus: (ticket: KitchenTicket, status: TicketStatus) => void;
  onDetails: (ticket: KitchenTicket) => void;
  onAddTime: (ticket: KitchenTicket, minutes: number) => void;
}) {
  const specialNotes = ticket.items.flatMap((item) => {
    const modifierNotes = item.modifiers
      .map((modifier) => `${modifier.name} ${modifier.value}`)
      .filter((value) => SPECIAL_NOTE_PATTERN.test(value));
    return [item.notes, ...modifierNotes].filter((note): note is string =>
      Boolean(note && SPECIAL_NOTE_PATTERN.test(note)),
    );
  });

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -24, scale: 0.96 }}
      transition={{ duration: 0.22 }}
      className={`flex min-h-[420px] flex-col overflow-hidden rounded-[24px] border-2 bg-[#fffdf9] shadow-[0_18px_50px_rgba(15,23,32,.12)] ${
        ticket.priority === "urgent"
          ? "border-red-500"
          : ticket.priority === "high"
            ? "border-orange-400"
            : "border-[#dfd4ca]"
      }`}
    >
      <header className="border-b border-[#eadfd5] bg-[#173044] px-5 py-4 text-white">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/65">
                Order
              </p>
              {ticket.priority !== "normal" && (
                <span className="rounded-full bg-[#C8102E] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                  {ticket.priority}
                </span>
              )}
              {ticket.status === "accepted" && (
                <span className="rounded-full bg-amber-300 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#173044]">
                  Held
                </span>
              )}
            </div>
            <h2 className="mt-1 truncate text-3xl font-black tracking-tight">
              #{ticket.orderNumber}
            </h2>
            <p className="mt-1 truncate text-sm font-bold text-white/75">
              {ticket.customerName || "Walk-in customer"}
            </p>
            <p className="mt-1 text-[11px] font-semibold text-white/60">
              {ticket.customerPhone || "No phone"}
              {ticket.orderTakerName
                ? ` · Taken by ${ticket.orderTakerName}`
                : ""}
            </p>
          </div>
          <div
            className={`shrink-0 rounded-2xl border px-3 py-2 text-center ${getTimerTone(ticket, now)}`}
            aria-label={`Elapsed time ${formatElapsed(getTicketStart(ticket), now)}`}
          >
            <FontAwesomeIcon icon={faClock} className="mr-2 text-sm" />
            <span className="font-mono text-xl font-black tabular-nums">
              {formatElapsed(getTicketStart(ticket), now)}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-wider">
          <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
            <FontAwesomeIcon
              icon={
                ticket.fulfilmentType === "dine_in" ? faChair : faMotorcycle
              }
            />
            {ticket.fulfilmentType === "dine_in" ? "Dine In" : "Pickup"}
            {ticket.tableLabel ? ` · ${ticket.tableLabel}` : ""}
          </span>
          {ticket.stationId?.name && (
            <span className="rounded-xl bg-white/10 px-3 py-2">
              {ticket.stationId.name}
            </span>
          )}
        </div>
      </header>

      <div className="flex-1 space-y-4 p-5">
        {specialNotes.length > 0 && (
          <div className="rounded-2xl border-2 border-red-400 bg-red-50 p-4 text-red-800">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em]">
              <FontAwesomeIcon icon={faTriangleExclamation} />
              Special instructions
            </div>
            <div className="mt-2 space-y-1">
              {[...new Set(specialNotes)].map((note) => (
                <p key={note} className="text-lg font-black leading-tight">
                  {note}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {ticket.items.map((item) => (
            <div
              key={item._id}
              className="border-b border-[#eee4dc] pb-4 last:border-0 last:pb-0"
            >
              <p className="text-xl font-black leading-tight text-[#172b3a]">
                <span className="text-[#C8102E]">{item.quantity} ×</span>{" "}
                {item.name}
              </p>
              {item.variantName && (
                <p className="mt-1 inline-flex rounded-lg bg-sky-50 px-2.5 py-1 text-sm font-black text-sky-800">
                  {/pizza/i.test(item.name)
                    ? "Size"
                    : /chur|naan/i.test(item.name)
                      ? "Plate"
                      : "Variant"}
                  : {item.variantName}
                </p>
              )}
              {item.modifiers.length > 0 && (
                <div className="mt-2 space-y-1 pl-4">
                  {item.modifiers.map((modifier, index) => (
                    <p
                      key={`${modifier.name}-${modifier.value}-${index}`}
                      className="text-base font-bold text-[#5f554d]"
                    >
                      {modifier.value.startsWith("-") ? "" : "+ "}
                      {modifier.name}: {modifier.value}
                    </p>
                  ))}
                </div>
              )}
              {item.notes && !SPECIAL_NOTE_PATTERN.test(item.notes) && (
                <p className="mt-2 rounded-xl bg-[#fff4e8] px-3 py-2 text-base font-black text-[#8b4d00]">
                  {item.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <footer className="grid gap-2 border-t border-[#eadfd5] bg-[#f8f2ec] p-4 sm:grid-cols-2">
        {isNewStatus(ticket.status) && (
          <button
            type="button"
            disabled={acting}
            onClick={() => onStatus(ticket, "preparing")}
            className="min-h-14 rounded-2xl bg-[#C8102E] px-4 text-base font-black text-white outline-none transition hover:bg-[#a50e27] focus-visible:ring-4 focus-visible:ring-red-200 disabled:opacity-60 sm:col-span-2"
          >
            <FontAwesomeIcon icon={faFireBurner} className="mr-2" />
            {acting ? "Updating…" : "Start Preparing"}
          </button>
        )}
        {ticket.status === "preparing" && (
          <button
            type="button"
            disabled={acting}
            onClick={() => onStatus(ticket, "ready")}
            className="min-h-14 rounded-2xl bg-emerald-700 px-4 text-base font-black text-white outline-none transition hover:bg-emerald-800 focus-visible:ring-4 focus-visible:ring-emerald-200 disabled:opacity-60 sm:col-span-2"
          >
            <FontAwesomeIcon icon={faCheck} className="mr-2" />
            {acting ? "Updating…" : "Mark Ready"}
          </button>
        )}
        {ticket.status === "ready" && (
          <button
            type="button"
            disabled={acting}
            onClick={() => onStatus(ticket, "served")}
            className="min-h-14 rounded-2xl bg-emerald-700 px-4 text-base font-black text-white outline-none transition hover:bg-emerald-800 focus-visible:ring-4 focus-visible:ring-emerald-200 disabled:opacity-60 sm:col-span-2"
          >
            <FontAwesomeIcon icon={faCheck} className="mr-2" />
            {acting ? "Updating…" : "Complete order"}
          </button>
        )}
        {ticket.status === "served" && (
          <div className="flex min-h-14 items-center justify-center rounded-2xl bg-sky-100 px-4 text-base font-black text-sky-800 sm:col-span-2">
            <FontAwesomeIcon icon={faCheck} className="mr-2" /> Order completed
          </div>
        )}
        {ticket.status === "queued" && (
          <button
            type="button"
            disabled={acting}
            onClick={() => onStatus(ticket, "accepted")}
            className="min-h-12 rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 text-sm font-black text-amber-900 outline-none focus-visible:ring-4 focus-visible:ring-amber-200 disabled:opacity-60"
          >
            <FontAwesomeIcon icon={faHand} className="mr-2" /> Hold
          </button>
        )}
        {ticket.status === "preparing" && (
          <>
            <button
              type="button"
              disabled={acting}
              onClick={() => onAddTime(ticket, 5)}
              className="min-h-12 rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 text-sm font-black text-amber-900"
            >
              +5 min
            </button>
            <button
              type="button"
              disabled={acting}
              onClick={() => onAddTime(ticket, 10)}
              className="min-h-12 rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 text-sm font-black text-amber-900"
            >
              +10 min
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => onDetails(ticket)}
          className={`min-h-12 rounded-2xl border-2 border-[#d9cec4] bg-white px-4 text-sm font-black text-[#173044] outline-none focus-visible:ring-4 focus-visible:ring-slate-200 ${
            ticket.status !== "queued" ? "sm:col-span-2" : ""
          }`}
        >
          View Details
        </button>
      </footer>
    </motion.article>
  );
}

