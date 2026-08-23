import { randomUUID } from "node:crypto";
import type { Server } from "socket.io";
import { REALTIME_EVENTS, type EventEnvelope, type PublishRequest } from "../types/events.js";
import type { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from "../types/socket.js";
import { room } from "../rooms/rooms.js";
type AppServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
export function isRealtimeEvent(value: string): value is PublishRequest["event"] { return (REALTIME_EVENTS as readonly string[]).includes(value); }
export function publishEvent(io: AppServer, request: PublishRequest): EventEnvelope {
  const envelope: EventEnvelope = { id: randomUUID(), event: request.event, occurredAt: new Date().toISOString(), data: request.data };
  if (request.actorId !== undefined) envelope.actorId = request.actorId;
  if (request.entityId !== undefined) envelope.entityId = request.entityId;
  if (request.target.broadcast === true) io.emit("domain:event", envelope);
  const rooms = new Set<string>(request.target.rooms ?? []);
  for (const userId of request.target.userIds ?? []) rooms.add(room.user(userId));
  for (const roleKey of request.target.roleKeys ?? []) rooms.add(room.role(roleKey));
  for (const targetRoom of rooms) io.to(targetRoom).emit("domain:event", envelope);
  return envelope;
}
