import type { ApiResponse, KitchenTicket, TicketStatus } from "@/components/admin/kds/kds.types";

async function parseResponse<T>(response: Response, fallback: string) {
  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !payload.success) throw new Error(payload.message || fallback);
  return payload.data;
}

export async function fetchKitchenTickets() {
  const response = await fetch("/api/v1/kds/tickets", { cache: "no-store" });
  return parseResponse<KitchenTicket[]>(response, "Unable to load kitchen tickets.");
}

export async function patchKitchenTicketStatus(ticketId: string, status: TicketStatus) {
  const response = await fetch(`/api/v1/kds/tickets/${ticketId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return parseResponse<KitchenTicket>(response, "Unable to update kitchen ticket.");
}

export async function extendKitchenPreparation(ticket: KitchenTicket, minutes: number) {
  const base = ticket.estimatedReadyAt && new Date(ticket.estimatedReadyAt).getTime() > Date.now()
    ? new Date(ticket.estimatedReadyAt).getTime()
    : Date.now();
  const response = await fetch(`/api/v1/admin/orders/${ticket.orderId}/status`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      status: "preparing",
      note: `Preparation time extended by ${minutes} minutes.`,
      estimatedReadyAt: new Date(base + minutes * 60_000).toISOString(),
    }),
  });
  await parseResponse<unknown>(response, "Unable to update preparation time.");
}
