"use client";

import { useEffect, useRef } from "react";
import {
  acquireRealtimeSocket,
  connectRealtimeSocket,
  releaseRealtimeSocket,
  type RealtimeEventEnvelope,
} from "@/lib/realtime/client";
import type { RealtimeEventName } from "@/types/realtime";

type Options = {
  events: readonly RealtimeEventName[];
  onEvent: (event: RealtimeEventEnvelope) => void | Promise<void>;
  enabled?: boolean;
  debounceMs?: number;
};

export function useRealtimeRefresh({ events, onEvent, enabled = true, debounceMs = 150 }: Options) {
  const onEventRef = useRef(onEvent);
  const eventKey = events.join("|");

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled) return;
    const socket = acquireRealtimeSocket();
    if (!socket) return;

    const acceptedEvents = new Set<RealtimeEventName>(
      eventKey.split("|").filter(Boolean) as RealtimeEventName[],
    );
    let timer: number | null = null;

    const handle = (event: RealtimeEventEnvelope) => {
      if (!acceptedEvents.has(event.event)) return;
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => void onEventRef.current(event), debounceMs);
    };

    socket.on("domain:event", handle);
    void connectRealtimeSocket(socket);

    return () => {
      if (timer !== null) window.clearTimeout(timer);
      socket.off("domain:event", handle);
      releaseRealtimeSocket();
    };
  }, [debounceMs, enabled, eventKey]);
}
