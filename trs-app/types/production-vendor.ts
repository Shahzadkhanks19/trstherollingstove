export type ProductionOrderStatus =
  | "draft"
  | "approved"
  | "in_progress"
  | "completed"
  | "cancelled";

export type ProductionBatchStatus =
  | "planned"
  | "in_progress"
  | "completed"
  | "failed"
  | "cancelled";

export type VendorQuoteStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "accepted"
  | "rejected"
  | "withdrawn";

export type VendorInvoiceStatus =
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "paid";

export type ProductionInputLine = {
  inventoryItemId: string;
  nameSnapshot: string;
  unitSnapshot: string;
  plannedQuantity: number;
  actualQuantity: number;
  unitCost: number;
};

export type ProductionOutputLine = {
  inventoryItemId: string;
  nameSnapshot: string;
  unitSnapshot: string;
  plannedQuantity: number;
  actualQuantity: number;
  unitCost: number;
};

export type VendorQuoteLine = {
  purchaseRequestLineId?: string;
  inventoryItemId?: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
  leadTimeDays: number;
};
