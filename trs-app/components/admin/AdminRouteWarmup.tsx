"use client";

import { useEffect, useRef } from "react";
import { warmAdminServerRoute } from "@/lib/admin/client-route-warmup";

const ROUTES_TO_WARM = [
  "/admin/pos",
  "/admin/pos/bills",
  "/admin/pos/cash-registers",
  "/admin/pos/print-center",
  "/admin/dashboard",
] as const;

const REWARM_AFTER_HIDDEN_MS = 2 * 60 * 1000;
const BETWEEN_ROUTES_MS = 450;

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }

    const timer = window.setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      window.clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}

/**
 * Quietly warms only the highest-frequency admin server routes one by one.
 * This replaces the old all-routes-at-once behavior that caused a request
 * storm, while hiding most serverless/database cold-start cost after refresh.
 */
export function AdminRouteWarmup() {
  const hiddenAt = useRef<number | null>(null);
  const activeController = useRef<AbortController | null>(null);

  useEffect(() => {
    const runWarmup = () => {
      activeController.current?.abort();
      const controller = new AbortController();
      activeController.current = controller;

      void (async () => {
        await sleep(250, controller.signal);
        for (const href of ROUTES_TO_WARM) {
          if (controller.signal.aborted || document.visibilityState !== "visible") return;
          try {
            await warmAdminServerRoute(href, controller.signal);
          } catch (error) {
            if ((error as Error).name !== "AbortError" && process.env.NODE_ENV !== "production") {
              console.debug(`[TRS admin warmup] ${href} failed`, error);
            }
          }
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
      if (wasHiddenFor >= REWARM_AFTER_HIDDEN_MS) runWarmup();
    };

    runWarmup();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      activeController.current?.abort();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}
