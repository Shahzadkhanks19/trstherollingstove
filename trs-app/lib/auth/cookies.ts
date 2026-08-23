import { cookies } from "next/headers";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

import { authConfig } from "@/config/auth";

export const ACCESS_COOKIE = "trs_access";
export const REFRESH_COOKIE = "trs_refresh";
export const REMEMBER_COOKIE = "trs_remember";

export function getAuthCookieOptions(): Partial<ResponseCookie> {
  const isProduction =
    process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure:
      isProduction &&
      authConfig.AUTH_COOKIE_SECURE === "true",
    sameSite: "lax",
    path: "/",
    ...(isProduction &&
    authConfig.AUTH_COOKIE_DOMAIN
      ? {
          domain:
            authConfig.AUTH_COOKIE_DOMAIN,
        }
      : {}),
  };
}

export async function setAuthCookies(
  accessToken: string,
  refreshToken: string,
  rememberMe: boolean,
): Promise<void> {
  const cookieStore = await cookies();
  const options = getAuthCookieOptions();

  cookieStore.set(
    ACCESS_COOKIE,
    accessToken,
    {
      ...options,
      maxAge:
        authConfig.ACCESS_TOKEN_TTL_SECONDS,
    },
  );

  cookieStore.set(
    REFRESH_COOKIE,
    refreshToken,
    {
      ...options,
      ...(rememberMe
        ? {
            maxAge:
              authConfig
                .REFRESH_TOKEN_TTL_SECONDS,
          }
        : {}),
    },
  );

  cookieStore.set(
    REMEMBER_COOKIE,
    rememberMe ? "true" : "false",
    {
      ...options,
      ...(rememberMe
        ? {
            maxAge:
              authConfig
                .REFRESH_TOKEN_TTL_SECONDS,
          }
        : {}),
    },
  );
}

export async function getRememberMePreference(): Promise<boolean> {
  const cookieStore = await cookies();

  return (
    cookieStore.get(REMEMBER_COOKIE)
      ?.value === "true"
  );
}

export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  const options = getAuthCookieOptions();

  cookieStore.set(ACCESS_COOKIE, "", {
    ...options,
    maxAge: 0,
  });

  cookieStore.set(REFRESH_COOKIE, "", {
    ...options,
    maxAge: 0,
  });

  cookieStore.set(REMEMBER_COOKIE, "", {
    ...options,
    maxAge: 0,
  });
}