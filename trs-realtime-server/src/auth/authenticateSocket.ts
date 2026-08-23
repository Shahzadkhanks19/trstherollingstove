import type { ExtendedError, Socket } from "socket.io";
import { Types } from "mongoose";
import { verifyAccessToken } from "./token.js";
import { User } from "../models/User.js";
import { AuthSession } from "../models/AuthSession.js";
import { Role } from "../models/Role.js";
import { Permission } from "../models/Permission.js";
import type { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from "../types/socket.js";
import { env } from "../config/env.js";

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
function readCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex < 0) continue;

    const key = part.slice(0, separatorIndex).trim();
    if (key !== name) continue;

    const value = part.slice(separatorIndex + 1).trim();
    if (!value) return null;

    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return null;
}

function readToken(socket: AppSocket): string {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === "string" && authToken.trim()) return authToken.trim();

  const header = socket.handshake.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) return header.slice(7).trim();

  const cookieToken = readCookie(socket.handshake.headers.cookie, env.ACCESS_COOKIE_NAME);
  if (cookieToken) return cookieToken;

  throw new Error("Access token is required");
}

export async function authenticateSocket(socket: AppSocket, next: (error?: ExtendedError) => void): Promise<void> {
  try {
    const claims = await verifyAccessToken(readToken(socket));
    if (!Types.ObjectId.isValid(claims.userId) || !Types.ObjectId.isValid(claims.sessionId)) throw new Error("Invalid token identifiers");
    const [user, session] = await Promise.all([
      User.findById(claims.userId).lean(),
      AuthSession.findOne({ _id: claims.sessionId, userId: claims.userId, revokedAt: null, expiresAt: { $gt: new Date() } }).lean()
    ]);
    if (!user || user.isActive !== true || user.tokenVersion !== claims.tokenVersion || !session) throw new Error("Session is inactive");
    const role = await Role.findOne({ _id: user.roleId, isActive: true }).lean();
    if (!role?.key) throw new Error("Role is inactive");
    const permissionDocs = await Permission.find({ _id: { $in: role.permissionIds ?? [] } }).select({ key: 1 }).lean();
    socket.data.user = {
      id: String(user._id), sessionId: claims.sessionId, name: user.name ?? "", email: user.email ?? "",
      roleId: String(role._id), roleKey: role.key, permissions: permissionDocs.map((item) => item.key).filter((key): key is string => typeof key === "string")
    };
    next();
  } catch (error) {
    console.warn("Realtime authentication rejected", error instanceof Error ? error.message : error);
    next(new Error("Authentication failed"));
  }
}
