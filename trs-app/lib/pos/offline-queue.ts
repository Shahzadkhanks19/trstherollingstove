"use client";

type QueuedMutation = { id: string; url: string; method: string; body: unknown; createdAt: string };
const KEY = "trs:pos:offline-mutations:v1";

function readQueue(): QueuedMutation[] {
  if (typeof window === "undefined") return [];
  try { const value: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]"); return Array.isArray(value) ? value as QueuedMutation[] : []; } catch { return []; }
}
function writeQueue(queue: QueuedMutation[]) { if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(queue)); }

export async function posMutation(url: string, body: unknown, method = "POST") {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const queue = readQueue();
    queue.push({ id: crypto.randomUUID(), url, method, body, createdAt: new Date().toISOString() });
    writeQueue(queue);
    return { queued: true, response: null as Response | null };
  }
  return { queued: false, response: await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) }) };
}

export async function flushPosMutationQueue() {
  const queue = readQueue();
  if (!queue.length || !navigator.onLine) return 0;
  const remaining: QueuedMutation[] = [];
  let completed = 0;
  for (const mutation of queue) {
    try {
      const response = await fetch(mutation.url, { method: mutation.method, headers: { "content-type": "application/json" }, body: JSON.stringify(mutation.body) });
      if (!response.ok) remaining.push(mutation); else completed += 1;
    } catch { remaining.push(mutation); }
  }
  writeQueue(remaining);
  return completed;
}

export function queuedPosMutationCount() { return readQueue().length; }
