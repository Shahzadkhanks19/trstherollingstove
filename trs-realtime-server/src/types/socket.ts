import type { SocketUser } from "./auth.js";
import type { EventEnvelope } from "./events.js";

export interface ClientToServerEvents {
  "room:subscribe": (
    payload: { room: string },
    ack?: (result: AckResult) => void,
  ) => void;
  "room:unsubscribe": (
    payload: { room: string },
    ack?: (result: AckResult) => void,
  ) => void;
  "presence:ping": (
    ack?: (result: { ok: true; serverTime: string }) => void,
  ) => void;
}

export interface ServerToClientEvents {
  "connection:ready": (payload: {
    user: SocketUser;
    socketId: string;
    serverTime: string;
  }) => void;
  "domain:event": (event: EventEnvelope) => void;
  "presence:updated": (payload: {
    userId: string;
    online: boolean;
    connections: number;
  }) => void;
  "server:error": (payload: { code: string; message: string }) => void;
}

export type InterServerEvents = Record<string, never>;
export interface SocketData {
  user: SocketUser;
}
export type AckResult = { ok: true } | { ok: false; error: string };
