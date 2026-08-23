import type { Server, Socket } from "socket.io";
import { automaticRooms, canSubscribe } from "../rooms/rooms.js";
import { connectPresence, disconnectPresence } from "../services/presence.js";
import { env } from "../config/env.js";
import type { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from "../types/socket.js";
type AppServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
export function registerSocketHandlers(io: AppServer, socket: AppSocket): void {
  const user = socket.data.user;
  const userRoom = `user:${user.id}`;
  const existing = io.sockets.adapter.rooms.get(userRoom)?.size ?? 0;
  if (existing >= env.MAX_CONNECTIONS_PER_USER) { socket.emit("server:error", { code: "CONNECTION_LIMIT", message: "Too many active connections" }); socket.disconnect(true); return; }
  void socket.join(automaticRooms(user));
  connectPresence(io, user.id);
  socket.emit("connection:ready", { user, socketId: socket.id, serverTime: new Date().toISOString() });
  socket.on("room:subscribe", async ({ room }, ack) => {
    if (!canSubscribe(user, room)) { ack?.({ ok: false, error: "Room access denied" }); return; }
    await socket.join(room); ack?.({ ok: true });
  });
  socket.on("room:unsubscribe", async ({ room }, ack) => {
    if (room === userRoom || room === `role:${user.roleKey}` || room === `session:${user.sessionId}`) { ack?.({ ok: false, error: "Required room cannot be left" }); return; }
    await socket.leave(room); ack?.({ ok: true });
  });
  socket.on("presence:ping", (ack) => ack?.({ ok: true, serverTime: new Date().toISOString() }));
  socket.on("disconnect", () => { disconnectPresence(io, user.id); });
}
