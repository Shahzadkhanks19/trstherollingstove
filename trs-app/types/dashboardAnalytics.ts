export type DashboardDateRange = {
  from: Date;
  to: Date;
};

export type RevenuePoint = {
  label: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
};

export type ProductPerformance = {
  itemId: string;
  name: string;
  quantity: number;
  revenue: number;
};

export type CustomerMetric = {
  totalCustomers: number;
  newCustomers: number;
  repeatCustomers: number;
};

export type DashboardOverview = {
  revenue: number;
  orders: number;
  averageOrderValue: number;
  customers: number;
  pendingOrders: number;
  completedOrders: number;
};
