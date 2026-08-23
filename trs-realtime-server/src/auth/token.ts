import { jwtVerify } from "jose";
import { env } from "../config/env.js";
import type { AccessClaims } from "../types/auth.js";
const secret = new TextEncoder().encode(env.ACCESS_TOKEN_SECRET);
export async function verifyAccessToken(token: string): Promise<AccessClaims> {
  const { payload } = await jwtVerify(token, secret);
  if (payload.typ !== "access" || !payload.sub || typeof payload.sid !== "string" || typeof payload.ver !== "number") throw new Error("Invalid access token");
  return { userId: payload.sub, sessionId: payload.sid, tokenVersion: payload.ver };
}
