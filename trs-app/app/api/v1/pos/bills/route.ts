import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { Invoice } from "@/models/Invoice";
import { Order } from "@/models/Order";

export async function GET(request: Request) {
  try {
    await requirePermission("pos.use");
    await connectToDatabase();
    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim() ?? "";
    const paymentMethod = url.searchParams.get("paymentMethod")?.trim() ?? "";
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));
    const filter: Record<string, unknown> = {};
    if (query) {
      filter.$or = [
        { invoiceNumber: { $regex: query, $options: "i" } },
        { orderNumber: { $regex: query, $options: "i" } },
        { "customerSnapshot.name": { $regex: query, $options: "i" } },
        { "customerSnapshot.phone": { $regex: query, $options: "i" } },
      ];
    }
    if (["cash", "upi"].includes(paymentMethod)) filter.paymentMethod = paymentMethod;
    const invoices = await Invoice.find(filter)
      .sort({ issuedAt: -1 })
      .limit(limit)
      .select("invoiceNumber orderId orderNumber issuedAt customerSnapshot paymentMethod grandTotal printCount lastPrintedAt")
      .lean();
    const orders = await Order.find({ _id: { $in: invoices.map((invoice) => invoice.orderId) } })
      .select("status paymentStatus")
      .lean();
    const orderMap = new Map(orders.map((order) => [String(order._id), order]));
    return successResponse(invoices.map((invoice) => ({
      ...invoice,
      orderId: String(invoice.orderId),
      orderStatus: orderMap.get(String(invoice.orderId))?.status ?? "completed",
      paymentStatus: orderMap.get(String(invoice.orderId))?.paymentStatus ?? "paid",
    })));
  } catch (error) {
    return handleApiError(error);
  }
}
