export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type ApiErrorDetail = {
  message: string;
  field?: string;
  code?: string;
  value?: unknown;
  path?: string;
  meta?: Record<string, unknown>;
};

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  message?: string;
  meta?: Record<string, unknown>;
};

export type ApiErrorResponse = {
  success: false;
  message: string;
  code?: string;
  errors?: ApiErrorDetail[];
  details?: ApiErrorDetail[];
  fieldErrors?: Record<string, string[]>;
};

export type ApiSuccess<T> = ApiSuccessResponse<T>;

export type ApiFailure = ApiErrorResponse;

export type ApiResponse<T> =
  | ApiSuccessResponse<T>
  | ApiErrorResponse;

export type Paginated<T> = {
  items: T[];
  meta: PaginationMeta;
};

export type UserRole =
  | "customer"
  | "staff"
  | "cashier"
  | "kitchen"
  | "manager"
  | "admin"
  | "super_admin";

export type SessionUser = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  role: UserRole;
  permissions: string[];
  emailVerified: boolean;
  phoneVerified: boolean;
};

export type Money = {
  amount: number;
  currency: "INR";
};

export type MenuItem = {
  id: string;
  slug: string;
  name: string;
  description: string;
  categoryId: string;
  imageUrl?: string;
  badge?: string;
  isVegetarian: true;
  isJainAvailable: boolean;
  isAvailable: boolean;
  spiceLevel?: "mild" | "medium" | "hot";
  variants: MenuVariant[];
  addOnIds: string[];
  rating?: number;
  reviewCount?: number;
};

export type MenuVariant = {
  id: string;
  label: string;
  size?: "small" | "medium" | "large" | "half" | "full";
  price: Money;
  isAvailable: boolean;
};

export type CartItem = {
  id: string;
  menuItemId: string;
  name: string;
  imageUrl?: string;
  quantity: number;
  variantId: string;
  variantLabel: string;
  unitPrice: Money;
  addOns: Array<{
    id: string;
    name: string;
    price: Money;
  }>;
  notes?: string;
  isJain: boolean;
};

export type OrderStatus =
  | "placed"
  | "confirmed"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled"
  | "refunded";

export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "partially_refunded";

export type OrderSummary = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  placedAt: string;
  itemCount: number;
  total: Money;
  pickupSlot?: string;
  thumbnailUrl?: string;
};

export type RewardWallet = {
  balance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  expiringSoon: number;
  expiryDate?: string;
};

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  href?: string;
};

export type DashboardMetric = {
  key: string;
  label: string;
  value: number;
  formattedValue: string;
  change?: number;
  trend?: "up" | "down" | "neutral";
};
