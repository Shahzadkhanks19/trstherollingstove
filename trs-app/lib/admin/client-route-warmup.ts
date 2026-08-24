"use client";

type PrefetchRouter = {
  prefetch: (href: string) => void;
};

const PREFETCH_COOLDOWN_MS = 4 * 60 * 1000;
const prefetchedAt = new Map<string, number>();

/**
 * Prevent duplicate hover/focus prefetches for the same admin route.
 * Next.js router.prefetch() performs the route prefetch; this helper simply
 * stops mouse-enter + focus from issuing the same request repeatedly.
 */
export function prefetchAdminRoute(router: PrefetchRouter, href: string) {
  const now = Date.now();
  const lastPrefetch = prefetchedAt.get(href) ?? 0;
  if (now - lastPrefetch < PREFETCH_COOLDOWN_MS) return;

  prefetchedAt.set(href, now);
  router.prefetch(href);
}

/**
 * Make a real no-store GET request to an admin route and discard the HTML.
 * This intentionally warms the Vercel/Next.js server function and its MongoDB
 * connection without retaining a potentially stale RSC page payload.
 */
export async function warmAdminServerRoute(href: string, signal?: AbortSignal) {
  await fetch(href, {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      Accept: "text/html",
      "X-TRS-Admin-Warmup": "1",
    },
    signal,
  });
}
