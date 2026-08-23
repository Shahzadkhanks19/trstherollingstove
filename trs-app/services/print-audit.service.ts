import { PrintJob } from "@/models/PrintJob";

type CreatePrintJobInput = {
  documentType: "invoice" | "kot" | "revision_kot" | "report";
  entityType: "invoice" | "running_order" | "order" | "cash_register" | "sales_report";
  entityId: string;
  orderId?: string | null;
  orderNumber?: string;
  label: string;
  printUrl: string;
  paper?: "a4" | "58mm" | "80mm";
  copies?: number;
  requestedBy: string;
  metadata?: Record<string, unknown>;
};

export async function createPrintJob(input: CreatePrintJobInput) {
  return PrintJob.create({
    ...input,
    copies: Math.min(10, Math.max(1, input.copies ?? 1)),
    status: "opened",
    openedAt: new Date(),
  });
}
