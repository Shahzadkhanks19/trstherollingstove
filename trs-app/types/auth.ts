export const PERMISSION_KEYS = [
  "users.read",
  "users.create",
  "users.update",
  "users.activate",
  "roles.read",
  "roles.create",
  "roles.update",
  "roles.delete",
  "permissions.read",
  "audit_logs.read",
  "menu.read",
  "menu.create",
  "menu.update",
  "menu.delete",
  "menu.manage",
  "orders.read",
  "orders.create",
  "orders.manage",
  "pos.use",
  "pos.manage",
  "kds.use",
  "kds.manage",
  "inventory.read",
  "inventory.manage",
  "suppliers.read",
  "suppliers.manage",
  "purchases.read",
  "purchases.manage",
  "payments.read",
  "payments.manage",
  "reports.read",
  "settings.manage",
  "customer.self",
  "reservations.read",
  "reservations.manage",
  "notifications.read",
  "notifications.manage",
  "reviews.read",
  "reviews.manage",
  "cms.read",
  "cms.manage",
] as const;
export type PermissionKey = (typeof PERMISSION_KEYS)[number];
export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roleId: string;
  roleKey: string;
  permissions: string[];
  sessionId: string;
}