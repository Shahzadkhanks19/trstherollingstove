import { SignJWT, jwtVerify } from "jose";

import { authConfig } from "@/config/auth";

const accessSecret = new TextEncoder().encode(authConfig.ACCESS_TOKEN_SECRET);
const refreshSecret = new TextEncoder().encode(authConfig.REFRESH_TOKEN_SECRET);

export interface AccessClaims {
  userId: string;
  sessionId: string;
  tokenVersion: number;
}

export interface RefreshClaims extends AccessClaims {
  tokenId: string;
}

async function signAccessClaims(
  claims: AccessClaims,
  ttlSeconds: number,
): Promise<string> {
  return new SignJWT({
    sid: claims.sessionId,
    ver: claims.tokenVersion,
    typ: "access",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.userId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttlSeconds)
    .sign(accessSecret);
}

export function signAccessToken(
  claims: AccessClaims,
  ttlSeconds = authConfig.ACCESS_TOKEN_TTL_SECONDS,
): Promise<string> {
  return signAccessClaims(claims, ttlSeconds);
}

export function signRealtimeAccessToken(
  claims: AccessClaims,
  ttlSeconds = 300,
): Promise<string> {
  return signAccessClaims(claims, ttlSeconds);
}

export async function signRefreshToken(claims: RefreshClaims): Promise<string> {
  return new SignJWT({
    sid: claims.sessionId,
    jti: claims.tokenId,
    ver: claims.tokenVersion,
    typ: "refresh",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.userId)
    .setIssuedAt()
    .setExpirationTime(
      Math.floor(Date.now() / 1000) + authConfig.REFRESH_TOKEN_TTL_SECONDS,
    )
    .sign(refreshSecret);
}

export async function verifyAccessToken(token: string): Promise<AccessClaims> {
  const { payload } = await jwtVerify(token, accessSecret);
  if (
    payload.typ !== "access" ||
    !payload.sub ||
    typeof payload.sid !== "string" ||
    typeof payload.ver !== "number"
  ) {
    throw new Error("Invalid access token");
  }

  return {
    userId: payload.sub,
    sessionId: payload.sid,
    tokenVersion: payload.ver,
  };
}

export async function verifyRefreshToken(token: string): Promise<RefreshClaims> {
  const { payload } = await jwtVerify(token, refreshSecret);
  if (
    payload.typ !== "refresh" ||
    !payload.sub ||
    typeof payload.sid !== "string" ||
    typeof payload.jti !== "string" ||
    typeof payload.ver !== "number"
  ) {
    throw new Error("Invalid refresh token");
  }

  return {
    userId: payload.sub,
    sessionId: payload.sid,
    tokenId: payload.jti,
    tokenVersion: payload.ver,
  };
}
