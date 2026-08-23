import { InvoiceActions } from "@/components/invoices/InvoiceActions";

/**
 * Admin order details:
 *
 * <InvoiceActions
 *   orderId={order._id}
 *   audience="admin"
 * />
 *
 * Customer order details:
 *
 * <InvoiceActions
 *   orderId={order._id}
 *   audience="customer"
 * />
 */

export function InvoiceIntegrationExample({
  orderId,
}: {
  orderId: string;
}) {
  return (
    <InvoiceActions
      orderId={orderId}
      audience="customer"
    />
  );
}
