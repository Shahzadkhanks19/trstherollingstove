import type { PermissionKey } from "@/types/auth";

export const PERMISSION_DEFINITIONS: Record<
  PermissionKey,
  {
    name: string;
    module: string;
    description: string;
  }
> = {
  "users.read": {
    name: "View users",
    module: "users",
    description: "View accounts.",
  },

  "users.create": {
    name: "Create users",
    module: "users",
    description: "Create accounts.",
  },

  "users.update": {
    name: "Update users",
    module: "users",
    description: "Update accounts.",
  },

  "users.activate": {
    name: "Activate users",
    module: "users",
    description: "Activate or deactivate accounts.",
  },

  "roles.read": {
    name: "View roles",
    module: "roles",
    description: "View roles.",
  },

  "roles.create": {
    name: "Create roles",
    module: "roles",
    description: "Create custom roles.",
  },

  "roles.update": {
    name: "Update roles",
    module: "roles",
    description: "Update roles.",
  },

  "roles.delete": {
    name: "Delete roles",
    module: "roles",
    description: "Delete custom roles.",
  },

  "permissions.read": {
    name: "View permissions",
    module: "roles",
    description: "View permissions.",
  },

  "audit_logs.read": {
    name: "View audit logs",
    module: "security",
    description: "View audit activity.",
  },

  "menu.read": {
    name: "View menu",
    module: "menu",
    description: "View menu categories, items, modifiers, and tax classes.",
  },

  "menu.manage": {
    name: "Manage menu",
    module: "menu",
    description:
      "Access general menu-management functionality retained for compatibility.",
  },

  "menu.create": {
    name: "Create menu",
    module: "menu",
    description:
      "Create menu categories, items, modifiers, and tax classes.",
  },

  "menu.update": {
    name: "Update menu",
    module: "menu",
    description:
      "Update menu categories, items, modifiers, pricing, and availability.",
  },

  "menu.delete": {
    name: "Delete menu",
    module: "menu",
    description:
      "Delete or archive menu categories, items, modifiers, and tax classes.",
  },

  "orders.read": {
    name: "View orders",
    module: "orders",
    description: "View orders.",
  },

  "orders.create": {
    name: "Create orders",
    module: "orders",
    description: "Create orders.",
  },

  "orders.manage": {
    name: "Manage orders",
    module: "orders",
    description: "Manage orders.",
  },

  "pos.use": {
    name: "Use POS",
    module: "pos",
    description: "Create counter orders and use active POS shifts.",
  },

  "pos.manage": {
    name: "Manage POS",
    module: "pos",
    description:
      "Manage POS registers, shifts, cash movements and reconciliation.",
  },

  "kds.use": {
    name: "Use KDS",
    module: "kds",
    description: "View and update kitchen tickets assigned to kitchen stations.",
  },

  "kds.manage": {
    name: "Manage KDS",
    module: "kds",
    description:
      "Manage kitchen stations, routing rules, priorities and KDS configuration.",
  },

  "inventory.read": {
    name: "View inventory",
    module: "inventory",
    description: "View inventory.",
  },

  "inventory.manage": {
    name: "Manage inventory",
    module: "inventory",
    description: "Manage inventory.",
  },


  "suppliers.read": {
    name: "View suppliers",
    module: "suppliers",
    description: "View supplier profiles, contacts and balances.",
  },

  "suppliers.manage": {
    name: "Manage suppliers",
    module: "suppliers",
    description:
      "Create and update suppliers and maintain supplier account details.",
  },

  "purchases.read": {
    name: "View purchases",
    module: "purchases",
    description:
      "View purchase orders, goods receipts and supplier payments.",
  },

  "purchases.manage": {
    name: "Manage purchases",
    module: "purchases",
    description:
      "Create, approve, receive, cancel and settle purchase orders.",
  },

  "payments.read": {
    name: "View payments",
    module: "payments",
    description: "View payments.",
  },

  "payments.manage": {
    name: "Manage payments",
    module: "payments",
    description: "Manage payments.",
  },

  "reports.read": {
    name: "View reports",
    module: "reports",
    description: "View reports.",
  },

  "settings.manage": {
    name: "Manage settings",
    module: "settings",
    description: "Manage settings.",
  },

  "customer.self": {
    name: "Customer self-service",
    module: "customer",
    description: "Access own customer data.",
  },

  "reservations.read": {
    name: "View reservations",
    module: "reservations",
    description: "View customer reservations.",
  },

  "reservations.manage": {
    name: "Manage reservations",
    module: "reservations",
    description:
      "Create, update, confirm, cancel and complete reservations.",
  },

  "notifications.read": {
    name: "View notifications",
    module: "notifications",
    description: "View notification deliveries and delivery status.",
  },

  "notifications.manage": {
    name: "Manage notifications",
    module: "notifications",
    description: "Send broadcasts and manage notification delivery.",
  },

  "reviews.read": {
    name: "View reviews",
    module: "reviews",
    description: "View customer reviews and ratings.",
  },

  "reviews.manage": {
    name: "Manage reviews",
    module: "reviews",
    description: "Moderate, feature and reply to customer reviews.",
  },

  "cms.read": {
    name: "View CMS content",
    module: "cms",
    description: "View banners, gallery items and testimonials.",
  },

  "cms.manage": {
    name: "Manage CMS content",
    module: "cms",
    description: "Create, update, publish and delete website CMS content.",
  },

};

const allPermissions = Object.keys(
  PERMISSION_DEFINITIONS,
) as PermissionKey[];

export const DEFAULT_ROLE_PERMISSIONS: Record<
  string,
  PermissionKey[]
> = {
  super_admin: allPermissions,

  admin: allPermissions.filter(
    (permission) => permission !== "roles.delete",
  ),

  manager: [
    "users.read",

    "menu.read",
    "menu.manage",
    "menu.create",
    "menu.update",

    "orders.read",
    "orders.create",
    "orders.manage",

    "reservations.read",
    "reservations.manage",

    "notifications.read",
    "notifications.manage",

    "reviews.read",
    "reviews.manage",

    "cms.read",
    "cms.manage",

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
    "reports.read",
  ],

  cashier: [
    "menu.read",

    "orders.read",
    "orders.create",

    "reservations.read",
    "reservations.manage",

    "notifications.read",

    "reviews.read",

    "cms.read",

    "pos.use",

    "payments.read",
  ],

  kitchen_staff: [
    "menu.read",
    "orders.read",
    "kds.use",
  ],

  inventory_staff: [
    "menu.read",
    "inventory.read",
    "inventory.manage",
    "suppliers.read",
    "suppliers.manage",
    "purchases.read",
    "purchases.manage",
  ],

  customer: [
    "menu.read",
    "orders.create",
    "customer.self",
  ],
};

export const DEFAULT_ROLE_NAMES: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
  cashier: "Cashier",
  kitchen_staff: "Kitchen Staff",
  inventory_staff: "Inventory Staff",
  customer: "Customer",
};