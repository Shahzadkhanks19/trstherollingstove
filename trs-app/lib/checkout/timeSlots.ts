export type StoreStatus = "open" | "busy" | "closed" | "not_accepting_orders";

export type PublicOrderingSettings = {
  orderingEnabled: boolean;
  dineInEnabled: boolean;
  pickupEnabled: boolean;
  preparationTimeMinutes: number;
  pickupBufferMinutes: number;
  openingTime: string;
  closingTime: string;
  orderSlotIntervalMinutes: number;
  storeStatus: StoreStatus;
  acceptingOrders: boolean;
  statusMessage: string;
  delayMessage: string;
};

export const DEFAULT_PUBLIC_ORDERING_SETTINGS: PublicOrderingSettings = {
  orderingEnabled: true,
  dineInEnabled: true,
  pickupEnabled: true,
  preparationTimeMinutes: 15,
  pickupBufferMinutes: 0,
  openingTime: "17:30",
  closingTime: "23:00",
  orderSlotIntervalMinutes: 15,
  storeStatus: "open",
  acceptingOrders: true,
  statusMessage: "Open and accepting online orders.",
  delayMessage: "We’re sorry—your order is taking longer than expected due to higher demand.",
};

function dateAtClock(base: Date, clock: string): Date {
  const [hours, minutes] = clock.split(":").map(Number);
  const value = new Date(base);
  value.setHours(hours || 0, minutes || 0, 0, 0);
  return value;
}

function roundUp(date: Date, interval: number): Date {
  const value = new Date(date);
  value.setSeconds(0, 0);
  const minutes = value.getHours() * 60 + value.getMinutes();
  value.setHours(0, Math.ceil(minutes / interval) * interval, 0, 0);
  return value;
}

export function generateSameDayOrderSlots(
  settings: PublicOrderingSettings,
  now = new Date(),
): Date[] {
  if (
    !settings.orderingEnabled ||
    !settings.acceptingOrders ||
    settings.storeStatus === "closed" ||
    settings.storeStatus === "not_accepting_orders"
  ) return [];

  const opening = dateAtClock(now, settings.openingTime);
  const closing = dateAtClock(now, settings.closingTime);
  const earliest = new Date(
    now.getTime() +
      (settings.preparationTimeMinutes + settings.pickupBufferMinutes) * 60_000,
  );

  let cursor = roundUp(
    new Date(Math.max(opening.getTime(), earliest.getTime())),
    settings.orderSlotIntervalMinutes,
  );
  const slots: Date[] = [];

  while (cursor <= closing) {
    slots.push(new Date(cursor));
    cursor = new Date(cursor.getTime() + settings.orderSlotIntervalMinutes * 60_000);
  }

  return slots;
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatClock(clock: string): string {
  return formatTime(dateAtClock(new Date(), clock));
}
