"use client";

import { useRouter } from "next/navigation";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import type { RealtimeEventName } from "@/types/realtime";

export function AdminRealtimePageRefresh({ events }: { events: readonly RealtimeEventName[] }) {
  const router = useRouter();
  useRealtimeRefresh({ events, onEvent: () => router.refresh(), debounceMs: 250 });
  return null;
}
