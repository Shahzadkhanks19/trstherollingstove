export type NavigationItem = {
  label: string;
  href: string;
  icon?: string;
  permission?: string;
};

export const publicNavigation: NavigationItem[] = [
  { label: "Home", href: "/" },
  { label: "Menu", href: "/menu" },
  { label: "Offers", href: "/offers" },
  { label: "About Us", href: "/about" },
  { label: "Track Order", href: "/track-order" },
  { label: "Contact Us", href: "/contact" },
];

export const customerNavigation: NavigationItem[] = [
  { label: "Dashboard", href: "/account" },
  { label: "My Orders", href: "/account/orders" },
  { label: "Reservations", href: "/account/reservations" },
  { label: "TRS Coins", href: "/account/rewards" },
  { label: "Favourite Items", href: "/account/favourites" },
  { label: "Reviews", href: "/account/reviews" },
  { label: "Notifications", href: "/account/notifications" },
  { label: "Profile", href: "/account/profile" },
  { label: "Settings", href: "/account/settings" },
];

export const adminNavigation: NavigationItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", permission: "dashboard.read" },
  { label: "Orders", href: "/admin/orders", permission: "orders.read" },
  { label: "Menu", href: "/admin/menu", permission: "menu.read" },
  { label: "Inventory", href: "/admin/inventory", permission: "inventory.read" },
  { label: "Reservations", href: "/admin/reservations", permission: "reservations.read" },
  { label: "Customers", href: "/admin/customers", permission: "users.read" },
  { label: "TRS Coins", href: "/admin/rewards", permission: "rewards.read" },
  { label: "Coupons & Offers", href: "/admin/coupons", permission: "orders.read" },
  { label: "Spin Wheel", href: "/admin/spin-wheel", permission: "settings.manage" },
  { label: "Referrals", href: "/admin/referrals", permission: "users.read" },
  { label: "Reviews", href: "/admin/reviews", permission: "reviews.read" },
  { label: "Notifications", href: "/admin/notifications", permission: "notifications.read" },
  { label: "Reports", href: "/admin/reports", permission: "reports.read" },
  { label: "Analytics", href: "/admin/analytics", permission: "analytics.read" },
  { label: "Roles & Permissions", href: "/admin/roles", permission: "roles.read" },
  { label: "Settings", href: "/admin/settings", permission: "settings.read" },
  { label: "Activity Logs", href: "/admin/activity-logs", permission: "activity.read" },
];

export const operationsNavigation: NavigationItem[] = [
  { label: "POS", href: "/pos", permission: "pos.use" },
  { label: "Kitchen Display", href: "/admin/kds", permission: "kds.use" },
  { label: "Shifts", href: "/pos/shifts", permission: "shifts.read" },
  { label: "Receipts", href: "/pos/receipts", permission: "receipts.read" },
];
