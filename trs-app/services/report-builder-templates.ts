import type { ReportDefinitionInput } from "@/types/report-builder";

export const REPORT_TEMPLATES: Array<{ key: string; label: string; description: string; definition: ReportDefinitionInput }> = [
  { key: "daily-sales", label: "Daily Sales Summary", description: "Revenue, tax, discounts and orders grouped by day.", definition: { name: "Daily Sales Summary", description: "Daily customer sales performance.", dataset: "orders", columns: [
    { key: "createdAt", label: "Order Date", type: "date", aggregation: "none" },
    { key: "grandTotal", label: "Revenue", type: "number", aggregation: "sum" },
    { key: "taxTotal", label: "Tax", type: "number", aggregation: "sum" },
    { key: "discountTotal", label: "Discount", type: "number", aggregation: "sum" },
    { key: "orderNumber", label: "Orders", type: "string", aggregation: "count" },
  ], filters: [{ field: "saleType", operator: "eq", value: "customer" }], groups: [{ field: "createdAt", interval: "day" }], sort: [{ field: "createdAt", direction: "desc" }], visualization: "line", chart: { categoryField: "createdAt", series: [{ field: "grandTotal", label: "Revenue" }], stacked: false, showLegend: true }, visibility: "private", tags: ["sales", "daily"], isFavorite: false, isPinned: false, templateKey: "daily-sales" } },
  { key: "internal-cost", label: "Internal Consumption by Type", description: "Menu value and order count by internal-consumption type.", definition: { name: "Internal Consumption by Type", description: "Internal consumption grouped by classification.", dataset: "internal_consumption", columns: [
    { key: "saleType", label: "Consumption Type", type: "string", aggregation: "none" },
    { key: "menuValue", label: "Menu Value", type: "number", aggregation: "sum" },
    { key: "orderNumber", label: "Orders", type: "string", aggregation: "count" },
  ], filters: [], groups: [{ field: "saleType", interval: "none" }], sort: [{ field: "menuValue", direction: "desc" }], visualization: "bar", chart: { categoryField: "saleType", series: [{ field: "menuValue", label: "Menu Value" }], stacked: false, showLegend: true }, visibility: "private", tags: ["internal-consumption", "cost"], isFavorite: false, isPinned: false, templateKey: "internal-cost" } },
];
