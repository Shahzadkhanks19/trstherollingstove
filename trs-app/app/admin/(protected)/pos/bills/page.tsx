import { createAdminMetadata } from "@/lib/admin/metadata";
import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { PosBillsClient, type PosBillListItem } from "@/components/admin/pos/PosBillsClient";
import { Invoice } from "@/models/Invoice";
import { Order } from "@/models/Order";

export const metadata = createAdminMetadata("POS Bills", "Search and reprint permanent POS bills.");
export const dynamic = "force-dynamic";

/**
 * Load the initial bill list as part of the prefetched RSC payload instead of
 * mounting the page and immediately making a second authenticated HTTP request.
 * The client still uses the API for filters and post-mutation refreshes.
 */
async function getInitialBills(): Promise<PosBillListItem[]> {
  await connectToDatabase();

  const invoices = await Invoice.find({})
    .sort({ issuedAt: -1 })
    .limit(100)
    .select("invoiceNumber orderId orderNumber issuedAt customerSnapshot paymentMethod grandTotal printCount")
    .lean();

  const orders = await Order.find({
    _id: { $in: invoices.map((invoice) => invoice.orderId) },
  })
    .select("status paymentStatus")
    .lean();

  const orderMap = new Map(orders.map((order) => [String(order._id), order]));

  return invoices.map((invoice) => {
    const orderId = String(invoice.orderId);
    const order = orderMap.get(orderId);
    const customer = invoice.customerSnapshot;

    return {
      _id: String(invoice._id),
      orderId,
      invoiceNumber: String(invoice.invoiceNumber ?? ""),
      orderNumber: String(invoice.orderNumber ?? ""),
      issuedAt: new Date(invoice.issuedAt ?? Date.now()).toISOString(),
      customerSnapshot: {
        name: String(customer?.name ?? "Walk-in Customer"),
        phone: customer?.phone ? String(customer.phone) : undefined,
      },
      paymentMethod: String(invoice.paymentMethod ?? ""),
      grandTotal: Number(invoice.grandTotal ?? 0),
      printCount: Number(invoice.printCount ?? 0),
      orderStatus: String(order?.status ?? "completed"),
      paymentStatus: String(order?.paymentStatus ?? "paid"),
    };
  });
}

export default async function PosBillsPage() {
  await requirePermission("pos.use");
  const initialBills = await getInitialBills();
  return <PosBillsClient initialBills={initialBills} />;
}
