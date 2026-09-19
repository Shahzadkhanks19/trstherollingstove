import type { KitchenTicket } from "@/components/admin/kds/kds.types";

export const SPECIAL_NOTE_PATTERN =
  /\b(jain|no onion|without onion|less spicy|extra crispy|birthday|allerg(?:y|ic|ies)|no garlic|gluten|nut)\b/i;

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready" },
  { key: "completed", label: "Completed" },
  { key: "priority", label: "Priority" },
];

export function getTicketStart(ticket: KitchenTicket) {
  return new Date(ticket.createdFromOrderAt || ticket.createdAt).getTime();
}

export function formatElapsed(startedAt: number, now: number) {
  const totalSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function getTimerTone(ticket: KitchenTicket, now: number) {
  const elapsedMinutes = (now - getTicketStart(ticket)) / 60_000;
  const target = ticket.stationId?.targetPreparationMinutes ?? 15;

  if (elapsedMinutes < target * 0.5) {
    return "border-emerald-300 bg-emerald-50 text-emerald-800";
  }
  if (elapsedMinutes < target * 0.8) {
    return "border-yellow-300 bg-yellow-50 text-yellow-800";
  }
  if (elapsedMinutes < target) {
    return "border-orange-300 bg-orange-50 text-orange-800";
  }
  return "border-red-300 bg-red-50 text-red-800";
}

export function isNewStatus(status: TicketStatus) {
  return status === "queued" || status === "accepted";
}

export function buildDetails(ticket: KitchenTicket) {
  const itemLines = ticket.items.map((item) => {
    const modifiers = item.modifiers
      .map((modifier) => `${modifier.name}: ${modifier.value}`)
      .join(", ");
    const note = item.notes ? ` — ${item.notes}` : "";
    const variant = item.variantName ? ` [${item.variantName}]` : "";
    return `${item.quantity} × ${item.name}${variant}${modifiers ? ` (${modifiers})` : ""}${note}`;
  });

  return [
    `Order ${ticket.orderNumber}`,
    ticket.customerName ? `Customer: ${ticket.customerName}` : "",
    ticket.fulfilmentType === "dine_in"
      ? `Dine In${ticket.tableLabel ? ` · ${ticket.tableLabel}` : ""}`
      : "Pickup",
    ticket.stationId?.name ? `Station: ${ticket.stationId.name}` : "",
    "",
    ...itemLines,
  ]
    .filter((line, index) => line || index === 4)
    .join("\n");
}

type BrowserWindowWithWebkitAudio = typeof window & {
  webkitAudioContext?: typeof AudioContext;
};

let notificationAudioContext: AudioContext | null = null;

function getNotificationAudioContext() {
  if (notificationAudioContext) return notificationAudioContext;

  const AudioContextClass =
    window.AudioContext ||
    (window as BrowserWindowWithWebkitAudio).webkitAudioContext;

  if (!AudioContextClass) return null;

  notificationAudioContext = new AudioContextClass();
  return notificationAudioContext;
}

export async function unlockNotificationAudio() {
  const context = getNotificationAudioContext();
  if (!context) return false;

  if (context.state === "suspended") {
    await context.resume();
  }

  return context.state === "running";
}

function scheduleNotificationBeep(
  context: AudioContext,
  startAt: number,
  frequency: number,
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startAt);

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(0.28, startAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.24);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + 0.25);
}

export async function playNotificationTone() {
  const context = getNotificationAudioContext();
  if (!context) return false;

  if (context.state === "suspended") {
    try {
      await context.resume();
    } catch {
      return false;
    }
  }

  if (context.state !== "running") return false;

  const startAt = context.currentTime + 0.02;
  scheduleNotificationBeep(context, startAt, 880);
  scheduleNotificationBeep(context, startAt + 0.32, 1100);
  return true;
}

