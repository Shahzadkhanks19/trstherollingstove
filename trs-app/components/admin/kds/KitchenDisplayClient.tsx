"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faBell,
  faCompress,
  faExpand,
  faLayerGroup,
  faMagnifyingGlass,
  faRotate,
  faTriangleExclamation,
  faUtensils,
  faVolumeHigh,
  faVolumeXmark,
} from "@fortawesome/free-solid-svg-icons";

import { CustomActionModal } from "@/components/admin/CustomActionModal";
import {
  acquireRealtimeSocket,
  connectRealtimeSocket,
  releaseRealtimeSocket,
  type RealtimeEventEnvelope,
} from "@/lib/realtime/client";

import type { ApiResponse, FilterKey, GroupedItem, KitchenTicket, RealtimeStatus, TicketStatus } from "@/components/admin/kds/kds.types";
import { buildDetails, FILTERS, getNotificationAudioContext, isNewStatus, playNotificationTone, unlockNotificationAudio } from "@/components/admin/kds/kds.utils";
import { TicketCard } from "@/components/admin/kds/KdsTicketCard";

export function KitchenDisplayClient({ userName }: { userName: string }) {
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actingTicketId, setActingTicketId] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [groupedView, setGroupedView] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundUnlocked, setSoundUnlocked] = useState(false);
  const [soundMessage, setSoundMessage] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [detailsTicket, setDetailsTicket] = useState<KitchenTicket | null>(
    null,
  );
  const [realtimeStatus, setRealtimeStatus] =
    useState<RealtimeStatus>("connecting");
  const knownTicketIds = useRef<Set<string> | null>(null);
  const soundEnabledRef = useRef(soundEnabled);

  const loadTickets = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/v1/kds/tickets", {
        cache: "no-store",
      });
      const payload = (await response.json()) as ApiResponse<KitchenTicket[]>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Unable to load kitchen tickets.");
      }

      const nextIds = new Set(payload.data.map((ticket) => ticket._id));
      if (knownTicketIds.current && soundEnabledRef.current) {
        const hasNewTicket = payload.data.some(
          (ticket) =>
            !knownTicketIds.current?.has(ticket._id) &&
            isNewStatus(ticket.status),
        );
        if (hasNewTicket) {
          void playNotificationTone().then((played) => {
            if (!played) {
              setSoundUnlocked(false);
              setSoundMessage(
                "Browser audio is blocked. Click Enable Sound once.",
              );
            }
          });
        }
      }
      knownTicketIds.current = nextIds;
      setTickets(payload.data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load kitchen tickets.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const storedPreference = window.localStorage.getItem(
        "trs-kds-sound-enabled",
      );

      if (storedPreference === "false") {
        setSoundEnabled(false);
        soundEnabledRef.current = false;
      }

      const context = getNotificationAudioContext();
      setSoundUnlocked(context?.state === "running");
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
    window.localStorage.setItem("trs-kds-sound-enabled", String(soundEnabled));
  }, [soundEnabled]);

  async function enableSound() {
    setSoundMessage("");

    try {
      const unlocked = await unlockNotificationAudio();

      if (!unlocked) {
        setSoundUnlocked(false);
        setSoundMessage(
          "Audio is not supported or is blocked by this browser.",
        );
        return;
      }

      setSoundEnabled(true);
      setSoundUnlocked(true);
      await playNotificationTone();
      setSoundMessage("Kitchen notification sound is enabled.");
    } catch {
      setSoundUnlocked(false);
      setSoundMessage(
        "Unable to enable sound. Check the browser tab and device volume.",
      );
    }
  }

  function disableSound() {
    setSoundEnabled(false);
    setSoundMessage("Kitchen notification sound is muted.");
  }

  useEffect(() => {
    const initialTimer = window.setTimeout(() => void loadTickets(), 0);
    const clockTimer = window.setInterval(() => setNow(Date.now()), 1_000);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") void loadTickets(true);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(clockTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadTickets]);

  useEffect(() => {
    const socket = acquireRealtimeSocket();

    if (!socket) {
      const unavailableTimer = window.setTimeout(
        () => setRealtimeStatus("unavailable"),
        0,
      );
      return () => window.clearTimeout(unavailableTimer);
    }

    let refreshTimer: number | null = null;

    const scheduleRefresh = () => {
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        void loadTickets(true);
      }, 150);
    };

    const handleDomainEvent = (event: RealtimeEventEnvelope) => {
      if (
        event.event.startsWith("kds.") ||
        event.event === "order.created" ||
        event.event === "order.updated" ||
        event.event === "order.status_changed" ||
        event.event === "order.cancelled"
      ) {
        scheduleRefresh();
      }
    };

    const handleConnect = () => setRealtimeStatus("connecting");
    const handleReady = () => {
      setRealtimeStatus("connected");
      socket.emit("room:subscribe", { room: "domain:kds" }, (result) => {
        if (!result.ok) setActionError(result.error);
      });
      scheduleRefresh();
    };
    const handleDisconnect = () => setRealtimeStatus("reconnecting");
    const handleConnectError = () => setRealtimeStatus("offline");
    const handleServerError = ({ message }: { message: string }) => {
      setRealtimeStatus("offline");
      setActionError(message);
    };

    socket.on("connect", handleConnect);
    socket.on("connection:ready", handleReady);
    socket.on("domain:event", handleDomainEvent);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("server:error", handleServerError);

    void connectRealtimeSocket(socket).then((connected) => {
      if (!connected) setRealtimeStatus("offline");
    });

    return () => {
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      socket.off("connect", handleConnect);
      socket.off("connection:ready", handleReady);
      socket.off("domain:event", handleDomainEvent);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("server:error", handleServerError);
      releaseRealtimeSocket();
    };
  }, [loadTickets]);

  useEffect(() => {
    function handleFullscreenChange() {
      setNow(Date.now());
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  async function updateStatus(ticket: KitchenTicket, status: TicketStatus) {
    if (actingTicketId) return;
    setActingTicketId(ticket._id);
    setActionError("");

    try {
      const response = await fetch(`/api/v1/kds/tickets/${ticket._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = (await response.json()) as ApiResponse<KitchenTicket>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Unable to update kitchen ticket.");
      }

      setTickets((current) =>
        current.map((item) => (item._id === ticket._id ? payload.data : item)),
      );
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update kitchen ticket.",
      );
    } finally {
      setActingTicketId("");
    }
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setActionError("Fullscreen mode is not available in this browser.");
    }
  }

  const counts = useMemo(
    () => ({
      all: tickets.filter(
        (ticket) => !["ready", "served", "cancelled"].includes(ticket.status),
      ).length,
      new: tickets.filter((ticket) => isNewStatus(ticket.status)).length,
      preparing: tickets.filter((ticket) => ticket.status === "preparing")
        .length,
      ready: tickets.filter((ticket) => ticket.status === "ready").length,
      completed: tickets.filter((ticket) => ticket.status === "served").length,
      priority: tickets.filter(
        (ticket) => ticket.priority !== "normal" && ticket.status !== "served",
      ).length,
    }),
    [tickets],
  );

  async function addPreparationTime(ticket: KitchenTicket, minutes: number) {
    setActingTicketId(ticket._id);
    try {
      const base =
        ticket.estimatedReadyAt &&
        new Date(ticket.estimatedReadyAt).getTime() > Date.now()
          ? new Date(ticket.estimatedReadyAt).getTime()
          : Date.now();
      const response = await fetch(
        `/api/v1/admin/orders/${ticket.orderId}/status`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            status: "preparing",
            note: `Preparation time extended by ${minutes} minutes.`,
            estimatedReadyAt: new Date(base + minutes * 60000).toISOString(),
          }),
        },
      );
      const payload = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok || !payload.success)
        throw new Error(
          payload.message || "Unable to update preparation time.",
        );
      await loadTickets(true);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to update preparation time.",
      );
    } finally {
      setActingTicketId("");
    }
  }

  const filteredTickets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesFilter =
        filter === "all"
          ? !["ready", "served", "cancelled"].includes(ticket.status)
          : filter === "new"
            ? isNewStatus(ticket.status)
            : filter === "preparing"
              ? ticket.status === "preparing"
              : filter === "ready"
                ? ticket.status === "ready"
                : filter === "completed"
                  ? ticket.status === "served"
                  : ticket.priority !== "normal" && ticket.status !== "served";

      const matchesSearch =
        !normalizedSearch ||
        ticket.orderNumber.toLowerCase().includes(normalizedSearch) ||
        ticket.customerName.toLowerCase().includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }, [filter, search, tickets]);

  const groupedItems = useMemo<GroupedItem[]>(() => {
    const groups = new Map<string, GroupedItem>();
    for (const ticket of filteredTickets) {
      for (const item of ticket.items) {
        const modifierText = item.modifiers
          .map((modifier) => `${modifier.name}: ${modifier.value}`)
          .sort()
          .join(" | ");
        const key = `${item.name.toLowerCase()}::${modifierText.toLowerCase()}`;
        const existing = groups.get(key) ?? {
          key,
          name: item.name,
          quantity: 0,
          tickets: [],
          modifiers: item.modifiers.map(
            (modifier) => `${modifier.name}: ${modifier.value}`,
          ),
          notes: [],
        };
        existing.quantity += item.quantity;
        existing.tickets.push(ticket.orderNumber);
        if (item.notes) existing.notes.push(item.notes);
        groups.set(key, existing);
      }
    }
    return [...groups.values()].sort((a, b) => b.quantity - a.quantity);
  }, [filteredTickets]);

  return (
    <div className="fixed inset-0 z-[120] flex flex-col overflow-hidden bg-[#0f1720] text-white">
      <header className="border-b border-white/10 bg-[#111d27] px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/admin/dashboard"
              aria-label="Return to admin dashboard"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/5 text-white outline-none hover:bg-white/10 focus-visible:ring-4 focus-visible:ring-white/20"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
            </Link>
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#C8102E] text-xl">
              <FontAwesomeIcon icon={faUtensils} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-xl font-black sm:text-2xl">
                  Kitchen Display System
                </h1>
                <span
                  className={`hidden rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider sm:inline ${
                    realtimeStatus === "connected"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : realtimeStatus === "connecting" ||
                          realtimeStatus === "reconnecting"
                        ? "bg-amber-500/15 text-amber-300"
                        : "bg-red-500/15 text-red-300"
                  }`}
                >
                  {realtimeStatus === "connected"
                    ? "Live"
                    : realtimeStatus === "connecting"
                      ? "Connecting"
                      : realtimeStatus === "reconnecting"
                        ? "Reconnecting"
                        : realtimeStatus === "unavailable"
                          ? "Not configured"
                          : "Offline"}
                </span>
              </div>
              <p className="truncate text-xs font-bold text-white/55">
                {userName} · Real-time kitchen updates
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-pressed={soundEnabled && soundUnlocked}
              onClick={() => {
                if (!soundUnlocked || !soundEnabled) {
                  void enableSound();
                  return;
                }

                disableSound();
              }}
              className={`min-h-11 rounded-xl border px-4 text-xs font-black outline-none transition focus-visible:ring-4 focus-visible:ring-white/20 ${
                soundEnabled && soundUnlocked
                  ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/20"
                  : "border-amber-300/30 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20"
              }`}
            >
              <FontAwesomeIcon
                icon={
                  soundEnabled && soundUnlocked ? faVolumeHigh : faVolumeXmark
                }
                className="mr-2"
              />
              {soundEnabled && soundUnlocked ? "Sound On" : "Enable Sound"}
            </button>
            {soundEnabled && soundUnlocked ? (
              <button
                type="button"
                onClick={() => void playNotificationTone()}
                className="min-h-11 rounded-xl border border-white/15 bg-white/5 px-4 text-xs font-black outline-none hover:bg-white/10 focus-visible:ring-4 focus-visible:ring-white/20"
              >
                Test Sound
              </button>
            ) : null}
            <button
              type="button"
              disabled={refreshing}
              onClick={() => void loadTickets(true)}
              className="min-h-11 rounded-xl border border-white/15 bg-white/5 px-4 text-xs font-black outline-none hover:bg-white/10 focus-visible:ring-4 focus-visible:ring-white/20 disabled:opacity-60"
            >
              <FontAwesomeIcon
                icon={faRotate}
                className={`mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              className="min-h-11 rounded-xl bg-[#C8102E] px-4 text-xs font-black outline-none hover:bg-[#a50e27] focus-visible:ring-4 focus-visible:ring-red-300/30"
            >
              <FontAwesomeIcon
                icon={
                  typeof document !== "undefined" && document.fullscreenElement
                    ? faCompress
                    : faExpand
                }
                className="mr-2"
              />
              Fullscreen
            </button>
          </div>
        </div>
      </header>

      {soundMessage ? (
        <p
          role="status"
          className={`border-b px-4 py-3 text-xs font-bold sm:px-6 ${
            soundEnabled && soundUnlocked
              ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
              : "border-amber-300/20 bg-amber-400/10 text-amber-100"
          }`}
        >
          {soundMessage}
        </p>
      ) : null}

      <section className="border-b border-white/10 bg-[#0f1720] px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-pressed={filter === item.key}
                onClick={() => setFilter(item.key)}
                className={`min-h-12 shrink-0 rounded-2xl px-4 text-sm font-black outline-none focus-visible:ring-4 focus-visible:ring-white/20 ${
                  filter === item.key
                    ? "bg-white text-[#173044]"
                    : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {item.label}
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${filter === item.key ? "bg-[#173044] text-white" : "bg-white/10"}`}
                >
                  {counts[item.key]}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative block min-w-0 sm:w-80">
              <span className="sr-only">
                Search by order number or customer name
              </span>
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/45"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Order number or customer"
                className="min-h-12 w-full rounded-2xl border border-white/15 bg-white/5 pl-11 pr-4 text-sm font-bold text-white outline-none placeholder:text-white/35 focus:border-white/40 focus:ring-4 focus:ring-white/10"
              />
            </label>
            <button
              type="button"
              aria-pressed={groupedView}
              onClick={() => setGroupedView((current) => !current)}
              className={`min-h-12 rounded-2xl px-4 text-sm font-black outline-none focus-visible:ring-4 focus-visible:ring-white/20 ${
                groupedView
                  ? "bg-[#E8A53A] text-[#172b3a]"
                  : "border border-white/15 bg-white/5"
              }`}
            >
              <FontAwesomeIcon icon={faLayerGroup} className="mr-2" />
              Group Items
            </button>
          </div>
        </div>
      </section>

      {(error || actionError) && (
        <div
          role="alert"
          className="mx-4 mt-4 flex items-center gap-3 rounded-2xl border border-red-400/40 bg-red-500/15 px-4 py-3 text-sm font-bold text-red-100 sm:mx-6"
        >
          <FontAwesomeIcon icon={faTriangleExclamation} />
          {actionError || error}
        </div>
      )}

      <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        {loading ? (
          <div className="grid min-h-[55vh] place-items-center text-center">
            <div>
              <FontAwesomeIcon
                icon={faRotate}
                className="text-4xl animate-spin text-[#E8A53A]"
              />
              <p className="mt-4 text-lg font-black">Loading kitchen queue…</p>
            </div>
          </div>
        ) : groupedView ? (
          groupedItems.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {groupedItems.map((item) => (
                <motion.article
                  layout
                  key={item.key}
                  className="rounded-[24px] border-2 border-white/10 bg-[#fffdf9] p-5 text-[#173044] shadow-2xl"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-4xl font-black text-[#C8102E]">
                        ×{item.quantity}
                      </p>
                      <h2 className="mt-2 text-2xl font-black leading-tight">
                        {item.name}
                      </h2>
                    </div>
                    <span className="rounded-xl bg-[#173044] px-3 py-2 text-xs font-black text-white">
                      {item.tickets.length} tickets
                    </span>
                  </div>
                  {item.modifiers.length > 0 && (
                    <div className="mt-4 rounded-2xl bg-[#f4ede6] p-4">
                      {item.modifiers.map((modifier) => (
                        <p key={modifier} className="font-bold">
                          + {modifier}
                        </p>
                      ))}
                    </div>
                  )}
                  {item.notes.length > 0 && (
                    <div className="mt-3 rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-red-800">
                      {[...new Set(item.notes)].map((note) => (
                        <p key={note} className="font-black">
                          {note}
                        </p>
                      ))}
                    </div>
                  )}
                  <p className="mt-4 text-sm font-black text-[#71645b]">
                    Orders:{" "}
                    {item.tickets.map((ticket) => `#${ticket}`).join(", ")}
                  </p>
                </motion.article>
              ))}
            </div>
          ) : (
            <EmptyState />
          )
        ) : filteredTickets.length > 0 ? (
          <motion.div
            layout
            className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
          >
            <AnimatePresence mode="popLayout">
              {filteredTickets.map((ticket) => (
                <TicketCard
                  key={ticket._id}
                  ticket={ticket}
                  now={now}
                  acting={actingTicketId === ticket._id}
                  onStatus={(selectedTicket, status) =>
                    void updateStatus(selectedTicket, status)
                  }
                  onDetails={setDetailsTicket}
                  onAddTime={(selectedTicket, minutes) =>
                    void addPreparationTime(selectedTicket, minutes)
                  }
                />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <EmptyState />
        )}
      </main>

      <CustomActionModal
        open={Boolean(detailsTicket)}
        title={
          detailsTicket
            ? `Order #${detailsTicket.orderNumber}`
            : "Order details"
        }
        description={detailsTicket ? buildDetails(detailsTicket) : ""}
        confirmLabel="Close"
        cancelLabel="Back"
        onClose={() => setDetailsTicket(null)}
        onConfirm={() => setDetailsTicket(null)}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="grid min-h-[55vh] place-items-center text-center">
      <div>
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-[28px] bg-emerald-500/15 text-3xl text-emerald-300">
          <FontAwesomeIcon icon={faBell} />
        </span>
        <h2 className="mt-5 text-2xl font-black">Kitchen queue is clear</h2>
        <p className="mt-2 font-bold text-white/50">
          New tickets will appear automatically.
        </p>
      </div>
    </div>
  );
}
