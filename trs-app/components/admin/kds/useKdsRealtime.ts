"use client";

import { useEffect } from "react";
import { acquireRealtimeSocket, connectRealtimeSocket, releaseRealtimeSocket, type RealtimeEventEnvelope } from "@/lib/realtime/client";
import type { RealtimeStatus } from "@/components/admin/kds/kds.types";

const REFRESH_EVENTS = new Set(["order.created","order.updated","order.status_changed","order.cancelled"]);

export function useKdsRealtime({onRefresh,onStatus,onError}:{onRefresh:()=>void;onStatus:(status:RealtimeStatus)=>void;onError:(message:string)=>void}) {
  useEffect(() => {
    const socket = acquireRealtimeSocket();
    if (!socket) {
      const timer = window.setTimeout(() => onStatus("unavailable"), 0);
      return () => window.clearTimeout(timer);
    }

    let refreshTimer: number | null = null;
    const scheduleRefresh = () => {
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        onRefresh();
      }, 150);
    };
    const handleDomainEvent = (event: RealtimeEventEnvelope) => {
      if (event.event.startsWith("kds.") || REFRESH_EVENTS.has(event.event)) scheduleRefresh();
    };
    const handleConnect = () => onStatus("connecting");
    const handleReady = () => {
      onStatus("connected");
      socket.emit("room:subscribe", { room: "domain:kds" }, (result) => {
        if (!result.ok) onError(result.error);
      });
      scheduleRefresh();
    };
    const handleDisconnect = () => onStatus("reconnecting");
    const handleConnectError = () => onStatus("offline");
    const handleServerError = ({ message }: { message: string }) => {
      onStatus("offline");
      onError(message);
    };

    socket.on("connect", handleConnect);
    socket.on("connection:ready", handleReady);
    socket.on("domain:event", handleDomainEvent);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("server:error", handleServerError);
    void connectRealtimeSocket(socket).then((connected) => {
      if (!connected) onStatus("offline");
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
  }, [onError, onRefresh, onStatus]);
}
