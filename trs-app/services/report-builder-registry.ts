import type { ReportColumnType, ReportDatasetKey } from "@/types/report-builder";

type RegistryColumn = { key: string; label: string; type: ReportColumnType; path: string };
type RegistryDataset = { key: ReportDatasetKey; label: string; description: string; collection: "orders"; baseMatch: Record<string, unknown>; columns: RegistryColumn[] };

export const REPORT_DATASETS: Record<ReportDatasetKey, RegistryDataset> = {
  orders: {
    key: "orders", label: "Orders", description: "Customer and POS order performance.", collection: "orders", baseMatch: {},
    columns: [
      { key: "orderNumber", label: "Order Number", type: "string", path: "$orderNumber" },
      { key: "createdAt", label: "Order Date", type: "date", path: "$createdAt" },
      { key: "saleType", label: "Sale Type", type: "string", path: "$saleType" },
      { key: "status", label: "Status", type: "string", path: "$status" },
      { key: "paymentMethod", label: "Payment Method", type: "string", path: "$paymentMethod" },
      { key: "subtotal", label: "Subtotal", type: "number", path: "$subtotal" },
      { key: "discountTotal", label: "Discount", type: "number", path: "$discountTotal" },
      { key: "taxTotal", label: "Tax", type: "number", path: "$taxTotal" },
      { key: "grandTotal", label: "Grand Total", type: "number", path: "$grandTotal" },
      { key: "itemCount", label: "Item Count", type: "number", path: "$itemCount" },
      { key: "customerName", label: "Customer", type: "string", path: "$customerSnapshot.name" },
    ],
  },
  internal_consumption: {
    key: "internal_consumption", label: "Internal Consumption", description: "Staff, family, complimentary, wastage and testing orders.", collection: "orders", baseMatch: { saleType: { $ne: "customer" } },
    columns: [
      { key: "orderNumber", label: "Order Number", type: "string", path: "$orderNumber" },
      { key: "createdAt", label: "Date", type: "date", path: "$createdAt" },
      { key: "saleType", label: "Consumption Type", type: "string", path: "$saleType" },
      { key: "personName", label: "Person", type: "string", path: "$internalConsumption.personName" },
      { key: "reason", label: "Reason", type: "string", path: "$internalConsumption.reason" },
      { key: "approvalStatus", label: "Approval Status", type: "string", path: "$internalConsumption.approvalStatus" },
      { key: "menuValue", label: "Menu Value", type: "number", path: "$internalConsumption.menuValue" },
      { key: "itemCount", label: "Item Count", type: "number", path: "$itemCount" },
    ],
  },
};

export function getDataset(key: ReportDatasetKey) { return REPORT_DATASETS[key]; }
export function getRegistryPayload() {
  return Object.values(REPORT_DATASETS).map(({ key, label, description, columns }) => ({ key, label, description, columns: columns.map(({ key: columnKey, label: columnLabel, type }) => ({ key: columnKey, label: columnLabel, type })) }));
}
