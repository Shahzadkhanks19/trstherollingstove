"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";

import { CustomActionModal } from "@/components/admin/CustomActionModal";
import type { FilterKey, GroupedItem, KitchenTicket, RealtimeStatus, TicketStatus } from "@/components/admin/kds/kds.types";
import { buildDetails, getNotificationAudioContext, isNewStatus, playNotificationTone, unlockNotificationAudio } from "@/components/admin/kds/kds.utils";
import { KdsControls, KdsHeader } from "@/components/admin/kds/KdsToolbar";
import { KdsQueue } from "@/components/admin/kds/KdsQueue";
import { extendKitchenPreparation, fetchKitchenTickets, patchKitchenTicketStatus } from "@/components/admin/kds/kds.api";
import { useKdsRealtime } from "@/components/admin/kds/useKdsRealtime";

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
      const data = await fetchKitchenTickets();
      const nextIds = new Set(data.map((ticket) => ticket._id));
      if (knownTicketIds.current && soundEnabledRef.current) {
        const hasNewTicket = data.some(
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
      setTickets(data);
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

  const handleRealtimeRefresh = useCallback(() => {
    void loadTickets(true);
  }, [loadTickets]);
  const handleRealtimeStatus = useCallback((status: RealtimeStatus) => {
    setRealtimeStatus(status);
  }, []);
  const handleRealtimeError = useCallback((message: string) => {
    setActionError(message);
  }, []);

  useKdsRealtime({
    onRefresh: handleRealtimeRefresh,
    onStatus: handleRealtimeStatus,
    onError: handleRealtimeError,
  });

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
      const updated = await patchKitchenTicketStatus(ticket._id, status);
      setTickets((current) => current.map((item) => item._id === ticket._id ? updated : item));
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : "Unable to update kitchen ticket.");
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
      await extendKitchenPreparation(ticket, minutes);
      await loadTickets(true);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to update preparation time.");
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
      <KdsHeader
        userName={userName}
        realtimeStatus={realtimeStatus}
        soundEnabled={soundEnabled}
        soundUnlocked={soundUnlocked}
        soundMessage={soundMessage}
        refreshing={refreshing}
        onToggleSound={() => { if (!soundUnlocked || !soundEnabled) void enableSound(); else disableSound(); }}
        onTestSound={() => void playNotificationTone()}
        onRefresh={() => void loadTickets(true)}
        onFullscreen={() => void toggleFullscreen()}
      />

      <KdsControls
        filter={filter}
        counts={counts}
        search={search}
        groupedView={groupedView}
        onFilter={setFilter}
        onSearch={setSearch}
        onToggleGrouped={() => setGroupedView((current) => !current)}
      />
      {(error || actionError) && (
        <div
          role="alert"
          className="mx-4 mt-4 flex items-center gap-3 rounded-2xl border border-red-400/40 bg-red-500/15 px-4 py-3 text-sm font-bold text-red-100 sm:mx-6"
        >
          <FontAwesomeIcon icon={faTriangleExclamation} />
          {actionError || error}
        </div>
      )}

      <KdsQueue
        loading={loading}
        groupedView={groupedView}
        groupedItems={groupedItems}
        tickets={filteredTickets}
        now={now}
        actingTicketId={actingTicketId}
        onStatus={(ticket, status) => void updateStatus(ticket, status)}
        onDetails={setDetailsTicket}
        onAddTime={(ticket, minutes) => void addPreparationTime(ticket, minutes)}
      />

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

