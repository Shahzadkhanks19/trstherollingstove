"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { prefetchAdminRoute } from "@/lib/admin/client-route-warmup";

const ROUTES_TO_PREFETCH = [
  "/admin/pos",
  "/admin/pos/bills",
  "/admin/pos/cash-registers",
  "/admin/pos/print-center",
  "/admin/dashboard",
] as const;

const REWARM_AFTER_HIDDEN_MS = 10 * 60 * 1000;
const BETWEEN_ROUTES_MS = 350;

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }

    const timer = window.setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

/**
 * Seeds the Next.js client router cache for the highest-frequency admin routes.
 *
 * Important: this intentionally does NOT make a second HTML warm-up request.
 * The old implementation re-ran after every pathname change and could create
 * background database traffic while the operator was actively navigating.
 */
export function AdminRouteWarmup() {
  const pathname = usePathname();
  const router = useRouter();
  const pathnameRef = useRef(pathname);
  const hiddenAt = useRef<number | null>(null);
  const activeController = useRef<AbortController | null>(null);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const runPrefetch = () => {
      activeController.current?.abort();
      const controller = new AbortController();
      activeController.current = controller;

      void (async () => {
        await sleep(300, controller.signal);
        for (const href of ROUTES_TO_PREFETCH) {
          if (controller.signal.aborted || document.visibilityState !== "visible") return;

          const currentPath = pathnameRef.current;
          if (currentPath === href || currentPath.startsWith(`${href}/`)) continue;

          prefetchAdminRoute(router, href);
          await sleep(BETWEEN_ROUTES_MS, controller.signal);
        }
      })();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt.current = Date.now();
        activeController.current?.abort();
        return;
      }

      const wasHiddenFor = hiddenAt.current == null ? 0 : Date.now() - hiddenAt.current;
      hiddenAt.current = null;
      if (wasHiddenFor >= REWARM_AFTER_HIDDEN_MS) runPrefetch();
    };

    runPrefetch();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      activeController.current?.abort();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [router]);

  return null;
}
