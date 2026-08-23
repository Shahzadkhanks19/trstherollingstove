import type { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from "../types/socket.js";
type AppServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
const counts = new Map<string, number>();
export function connectPresence(io: AppServer, userId: string): number {
  const count = (counts.get(userId) ?? 0) + 1; counts.set(userId, count);
  io.to("domain:users").emit("presence:updated", { userId, online: true, connections: count }); return count;
}
export function disconnectPresence(io: AppServer, userId: string): number {
  const count = Math.max(0, (counts.get(userId) ?? 1) - 1);
  if (count === 0) counts.delete(userId); else counts.set(userId, count);
  io.to("domain:users").emit("presence:updated", { userId, online: count > 0, connections: count }); return count;
}
export function presenceCount(): number { return counts.size; }
