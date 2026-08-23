import { io, type Socket } from "socket.io-client";

import type { RealtimeEventName } from "@/types/realtime";

export type RealtimeEventEnvelope = {
  id: string;
  event: RealtimeEventName;
  occurredAt: string;
  actorId?: string;
  entityId?: string;
  data: Record<string, unknown>;
};

type SocketUser = {
  id: string;
  sessionId: string;
  name: string;
  email: string;
  roleId: string;
  roleKey: string;
  permissions: string[];
};

type AckResult =
  | { ok: true }
  | { ok: false; error: string };

type RealtimeTokenResponse = {
  success: boolean;
  data?: {
    authenticated: boolean;
    token: string | null;
    expiresAt: string | null;
  };
};

type ServerToClientEvents = {
  "connection:ready": (payload: {
    user: SocketUser;
    socketId: string;
    serverTime: string;
  }) => void;
  "domain:event": (event: RealtimeEventEnvelope) => void;
  "presence:updated": (payload: {
    userId: string;
    online: boolean;
    connections: number;
  }) => void;
  "server:error": (payload: {
    code: string;
    message: string;
  }) => void;
};

type ClientToServerEvents = {
  "room:subscribe": (
    payload: { room: string },
    ack?: (result: AckResult) => void,
  ) => void;
  "room:unsubscribe": (
    payload: { room: string },
    ack?: (result: AckResult) => void,
  ) => void;
  "presence:ping": (
    ack?: (result: {
      ok: true;
      serverTime: string;
    }) => void,
  ) => void;
};

export type RealtimeSocket = Socket<
  ServerToClientEvents,
  ClientToServerEvents
>;

let sharedSocket: RealtimeSocket | null = null;
let consumerCount = 0;
let disconnectTimer: ReturnType<typeof setTimeout> | null = null;
let realtimeToken: { token: string; expiresAt: number } | null = null;
let tokenRequest: Promise<string | null> | null = null;

async function fetchRealtimeToken(): Promise<string | null> {
  if (realtimeToken && realtimeToken.expiresAt - Date.now() > 30_000) {
    return realtimeToken.token;
  }

  if (tokenRequest) return tokenRequest;

  tokenRequest = (async () => {
    try {
      const response = await fetch("/api/v1/auth/realtime-token", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) return null;

      const payload = (await response.json()) as RealtimeTokenResponse;
      const token = payload.data?.token;
      const expiresAt = payload.data?.expiresAt;

      if (!payload.data?.authenticated || !token || !expiresAt) return null;

      realtimeToken = {
        token,
        expiresAt: new Date(expiresAt).getTime(),
      };
      return token;
    } catch {
      return null;
    } finally {
      tokenRequest = null;
    }
  })();

  return tokenRequest;
}

export async function connectRealtimeSocket(
  socket: RealtimeSocket,
): Promise<boolean> {
  if (socket.connected) return true;

  const token = await fetchRealtimeToken();
  if (!token) return false;

  socket.auth = (callback) => {
    void fetchRealtimeToken().then((freshToken) => {
      callback({ token: freshToken ?? token });
    });
  };
  socket.connect();
  return true;
}

export function acquireRealtimeSocket(): RealtimeSocket | null {
  const serverUrl =
    process.env.NEXT_PUBLIC_REALTIME_SERVER_URL?.trim();

  if (!serverUrl) {
    return null;
  }

  if (disconnectTimer) {
    clearTimeout(disconnectTimer);
    disconnectTimer = null;
  }

  consumerCount += 1;

  if (sharedSocket) {
    return sharedSocket;
  }

  sharedSocket = io(serverUrl.replace(/\/+$/, ""), {
    autoConnect: false,
    withCredentials: true,
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 10_000,
    timeout: 10_000,
  });

  return sharedSocket;
}

export function releaseRealtimeSocket(): void {
  consumerCount = Math.max(0, consumerCount - 1);
  if (consumerCount > 0 || !sharedSocket) return;

  disconnectTimer = setTimeout(() => {
    if (consumerCount > 0 || !sharedSocket) return;
    sharedSocket.disconnect();
    sharedSocket = null;
    disconnectTimer = null;
  }, 500);
}

/** @deprecated Use acquireRealtimeSocket and releaseRealtimeSocket. */
export const createRealtimeSocket = acquireRealtimeSocket;
