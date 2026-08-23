import { timingSafeEqual } from "node:crypto";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import type { Server } from "socket.io";

import { env, corsOrigins } from "../config/env.js";
import { publishEvent, isRealtimeEvent } from "../services/publisher.js";
import { presenceCount } from "../services/presence.js";
import { domainPermissions } from "../rooms/rooms.js";

import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "../types/socket.js";

import type {
  EventTarget,
  PublishRequest,
} from "../types/events.js";

type AppServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

const MAX_TARGETS_PER_KIND = 100;
const identifierPattern = /^[A-Za-z0-9:_-]{1,128}$/;
const roleKeyPattern = /^[a-z0-9_-]{1,64}$/;

function secureSecretMatches(supplied: string | undefined): boolean {
  if (!supplied) {
    return false;
  }

  const expectedBuffer = Buffer.from(env.REALTIME_INTERNAL_SECRET);
  const suppliedBuffer = Buffer.from(supplied);

  return (
    expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer)
  );
}

function normalizeStringArray(
  value: unknown,
  validator: (item: string) => boolean,
): string[] | null {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value) || value.length > MAX_TARGETS_PER_KIND) {
    return null;
  }

  const normalized = new Set<string>();

  for (const item of value) {
    if (typeof item !== "string") {
      return null;
    }

    const trimmed = item.trim();

    if (!validator(trimmed)) {
      return null;
    }

    normalized.add(trimmed);
  }

  return [...normalized];
}

function normalizeTarget(value: unknown): EventTarget | null {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return null;
  }

  const raw = value as Record<string, unknown>;

  const rooms = normalizeStringArray(raw.rooms, (item) => {
    if (!item.startsWith("domain:")) {
      return false;
    }

    const domain = item.slice("domain:".length);

    return Object.hasOwn(domainPermissions, domain);
  });

  const userIds = normalizeStringArray(
    raw.userIds,
    (item) => identifierPattern.test(item),
  );

  const roleKeys = normalizeStringArray(
    raw.roleKeys,
    (item) => roleKeyPattern.test(item),
  );

  if (!rooms || !userIds || !roleKeys) {
    return null;
  }

  const broadcast = raw.broadcast === true;

  if (
    !broadcast &&
    rooms.length === 0 &&
    userIds.length === 0 &&
    roleKeys.length === 0
  ) {
    return null;
  }

  return {
    ...(rooms.length > 0 ? { rooms } : {}),
    ...(userIds.length > 0 ? { userIds } : {}),
    ...(roleKeys.length > 0 ? { roleKeys } : {}),
    ...(broadcast ? { broadcast: true } : {}),
  };
}

export function createHttpApp(io: AppServer) {
  const app = express();

  app.set("trust proxy", env.TRUST_PROXY);

  app.use(helmet());

  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
    }),
  );

  app.use(
    express.json({
      limit: "256kb",
    }),
  );

  app.get("/health/live", (_req, res) => {
    res.json({
      ok: true,
      service: "trs-realtime-server",
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/health/ready", (_req, res) => {
    const databaseReady = mongoose.connection.readyState === 1;

    res.status(databaseReady ? 200 : 503).json({
      ok: databaseReady,
      databaseReady,
      connectedSockets: io.engine.clientsCount,
      onlineUsers: presenceCount(),
      timestamp: new Date().toISOString(),
    });
  });

  app.post("/internal/events", (req, res) => {
    const suppliedSecret = req.header("x-realtime-secret");

    if (!secureSecretMatches(suppliedSecret)) {
      res.status(401).json({
        ok: false,
        error: "Unauthorized",
      });

      return;
    }

    const body = req.body as Partial<PublishRequest>;
    const target = normalizeTarget(body.target);

    if (
      typeof body.event !== "string" ||
      !isRealtimeEvent(body.event) ||
      typeof body.data !== "object" ||
      body.data === null ||
      Array.isArray(body.data) ||
      !target
    ) {
      res.status(400).json({
        ok: false,
        error: "Invalid event payload",
      });

      return;
    }

    if (
      body.actorId !== undefined &&
      (
        typeof body.actorId !== "string" ||
        !identifierPattern.test(body.actorId)
      )
    ) {
      res.status(400).json({
        ok: false,
        error: "Invalid actor identifier",
      });

      return;
    }

    if (
      body.entityId !== undefined &&
      (
        typeof body.entityId !== "string" ||
        !identifierPattern.test(body.entityId)
      )
    ) {
      res.status(400).json({
        ok: false,
        error: "Invalid entity identifier",
      });

      return;
    }

    const request: PublishRequest = {
      event: body.event,
      data: body.data as Record<string, unknown>,
      target,

      ...(typeof body.actorId === "string"
        ? { actorId: body.actorId }
        : {}),

      ...(typeof body.entityId === "string"
        ? { entityId: body.entityId }
        : {}),
    };

    const event = publishEvent(io, request);

    res.status(202).json({
      ok: true,
      event,
    });
  });

  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      if (error instanceof SyntaxError) {
        res.status(400).json({
          ok: false,
          error: "Invalid JSON payload",
        });

        return;
      }

      next(error);
    },
  );

  return app;
}