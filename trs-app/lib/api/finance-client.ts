"use client";

import { authenticatedFetch } from "@/lib/api/client";

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  code?: string;
};

function isJsonContentType(value: string | null): boolean {
  return Boolean(value?.toLowerCase().includes("application/json"));
}

function withRetryMarker(url: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}__finance_retry=${Date.now()}`;
}

function extractHtmlTitle(body: string): string | null {
  const match = body.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1]?.trim() || null;
}

async function requestOnce<T>(
  url: string,
  init: RequestInit,
): Promise<{ response: Response; payload: ApiEnvelope<T> | null; rawBody: string }> {
  const response = await authenticatedFetch(url, {
    ...init,
    cache: init.cache ?? "no-store",
    credentials: init.credentials ?? "include",
    headers: {
      Accept: "application/json",
      ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });

  const rawBody = await response.text();
  const contentType = response.headers.get("content-type");

  if (!isJsonContentType(contentType)) {
    return { response, payload: null, rawBody };
  }

  try {
    return {
      response,
      payload: rawBody ? (JSON.parse(rawBody) as ApiEnvelope<T>) : null,
      rawBody,
    };
  } catch {
    return { response, payload: null, rawBody };
  }
}

export async function financeApi<T>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  let result = await requestOnce<T>(url, init);

  // During development, Turbopack can briefly answer a newly compiled route with
  // its HTML error shell. Retry one idempotent request before surfacing an error.
  if (method === "GET" && result.payload === null) {
    await new Promise((resolve) => window.setTimeout(resolve, 150));
    result = await requestOnce<T>(withRetryMarker(url), init);
  }

  const { response, payload, rawBody } = result;

  if (payload === null) {
    const title = extractHtmlTitle(rawBody);
    const redirectedTo = response.redirected ? new URL(response.url).pathname : null;

    if (redirectedTo?.includes("login") || response.status === 401) {
      throw new Error("Your admin session has expired. Sign in again and reload this page.");
    }

    const detail = title && !title.toLowerCase().includes("the rolling stove")
      ? ` ${title}`
      : "";

    throw new Error(
      `Finance API returned an invalid response (${response.status || "unknown status"}) for ${url}.${detail} Restart the Next.js development server if this route was just added.`,
    );
  }

  if (!response.ok || payload.success === false) {
    throw new Error(payload.message ?? `Finance request failed with status ${response.status}.`);
  }

  if (!("data" in payload)) {
    throw new Error(`Finance API response for ${url} did not contain a data field.`);
  }

  return payload.data as T;
}
