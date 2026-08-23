
export type InventoryAlertType =
 | "low_stock"
 | "reorder"
 | "near_expiry"
 | "expired"
 | "overstock"
 | "negative_stock"
 | "slow_moving"
 | "dead_stock";

export type InventoryReportType =
 | "valuation"
 | "consumption"
 | "cogs"
 | "expiry"
 | "abc_analysis"
 | "supplier_performance"
 | "stock_ledger";
