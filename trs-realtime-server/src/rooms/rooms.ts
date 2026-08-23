import type { SocketUser } from "../types/auth.js";
export const room = {
  user: (id: string) => `user:${id}`,
  role: (key: string) => `role:${key}`,
  session: (id: string) => `session:${id}`,
  domain: (name: string) => `domain:${name}`
};

export const domainPermissions: Record<string, string[]> = {
  orders: ["orders.read", "orders.manage", "pos.use", "kds.use"],
  kds: ["kds.use", "kds.manage"], pos: ["pos.use", "pos.manage"],
  inventory: ["inventory.read", "inventory.manage"], reservations: ["reservations.read", "reservations.manage"],
  notifications: ["notifications.read", "notifications.manage"], enquiries: ["notifications.read", "notifications.manage"],
  payments: ["payments.read", "payments.manage"], content: ["cms.read", "cms.manage"], dashboard: ["reports.read"], menu: ["menu.read", "menu.manage"],
  settings: ["settings.manage"], users: ["users.read", "users.update"], reviews: ["reviews.read", "reviews.manage"]
};
export function canSubscribe(user: SocketUser, requestedRoom: string): boolean {
  if (requestedRoom === room.user(user.id) || requestedRoom === room.role(user.roleKey) || requestedRoom === room.session(user.sessionId)) return true;
  if (!requestedRoom.startsWith("domain:")) return false;
  const domain = requestedRoom.slice("domain:".length);
  const required = domainPermissions[domain];
  return required ? required.some((permission) => user.permissions.includes(permission)) : false;
}
export function automaticRooms(user: SocketUser): string[] {
  const rooms = [room.user(user.id), room.role(user.roleKey), room.session(user.sessionId)];
  for (const domain of Object.keys(domainPermissions)) if (canSubscribe(user, room.domain(domain))) rooms.push(room.domain(domain));
  return rooms;
}
