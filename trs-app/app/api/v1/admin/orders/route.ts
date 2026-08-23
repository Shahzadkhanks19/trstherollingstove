import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { Order } from "@/models/Order";
import { POSRunningOrder } from "@/models/POSRunningOrder";
import { calculatePosCartTotals } from "@/lib/pos/cart";

const allowedSortFields = new Set([
  "createdAt",
  "updatedAt",
  "grandTotal",
  "orderNumber",
  "status",
  "paymentStatus",
]);

export async function GET(request: Request) {
  try {
    await requirePermission("orders.read");
    await connectToDatabase();

    const url = new URL(request.url);
    const page = Math.max(Number(url.searchParams.get("page") ?? 1), 1);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 25), 1), 100);
    const status = url.searchParams.get("status")?.trim();
    const orderMode = url.searchParams.get("orderMode")?.trim();
    const paymentStatus = url.searchParams.get("paymentStatus")?.trim();
    const paymentMethod = url.searchParams.get("paymentMethod")?.trim();
    const search = url.searchParams.get("search")?.trim();
    const from = url.searchParams.get("from")?.trim();
    const to = url.searchParams.get("to")?.trim();
    const requestedSort = url.searchParams.get("sortBy")?.trim() || "createdAt";
    const sortBy = allowedSortFields.has(requestedSort) ? requestedSort : "createdAt";
    const sortOrder = url.searchParams.get("sortOrder") === "asc" ? 1 : -1;

    const filter: Record<string, unknown> = {};
    if (status === "live") filter.status = { $in: ["placed", "accepted", "preparing", "ready"] };
    else if (status && status !== "all") filter.status = status;
    if (orderMode && orderMode !== "all") filter.orderMode = orderMode;
    if (paymentStatus && paymentStatus !== "all") filter.paymentStatus = paymentStatus;
    if (paymentMethod && paymentMethod !== "all") filter.paymentMethod = paymentMethod;
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = { $regex: escaped, $options: "i" };
      filter.$or = [
        { orderNumber: regex },
        { "customerSnapshot.name": regex },
        { "customerSnapshot.phone": regex },
        { "customerSnapshot.email": regex },
      ];
    }

    if (from || to) {
      const createdAt: Record<string, Date> = {};
      if (from) {
        const start = new Date(`${from}T00:00:00.000Z`);
        if (!Number.isNaN(start.getTime())) createdAt.$gte = start;
      }
      if (to) {
        const end = new Date(`${to}T23:59:59.999Z`);
        if (!Number.isNaN(end.getTime())) createdAt.$lte = end;
      }
      if (Object.keys(createdAt).length) filter.createdAt = createdAt;
    }

    const countFilter = { ...filter };
    delete countFilter.status;

    const includeRunningOrders = status === "live";
    const [orders, total, groupedStatuses, runningOrders] = await Promise.all([
      Order.find(filter)
        .sort({ [sortBy]: sortOrder, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
      Order.aggregate<{ _id: string; count: number }>([
        { $match: countFilter },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      includeRunningOrders
        ? POSRunningOrder.find({ status: { $in: ["open", "sent_to_kitchen", "partially_paid"] } })
            .sort({ openedAt: 1 })
            .lean()
        : Promise.resolve([]),
    ]);

    const runningOrderRows = runningOrders.map((running) => {
      const totals = calculatePosCartTotals(running.cart);
      return {
        _id: `running:${String(running._id)}`,
        isRunningOrder: true,
        runningOrderId: String(running._id),
        orderNumber: running.ticketNumber,
        customerSnapshot: {
          name: running.cart.customer.name || "Walk-in Customer",
          phone: running.cart.customer.phone || "",
          email: running.cart.customer.email || "",
        },
        items: running.cart.lines.map((line) => ({
          _id: line.lineId,
          name: line.name,
          imageUrl: line.imageUrl,
          variantName: line.variantName || "",
          baseUnitPrice: line.basePrice,
          modifiers: line.modifiers.flatMap((modifier) =>
            Array.from({ length: Math.max(1, modifier.quantity) }, () => ({
              groupName: modifier.groupName,
              optionName: modifier.optionName,
              unitPrice: modifier.unitPrice,
            })),
          ),
          quantity: line.quantity,
          specialInstructions: line.note,
          lineUnitPrice: line.unitPrice,
          lineTotal: Number((line.unitPrice * line.quantity).toFixed(2)),
        })),
        orderMode: running.cart.orderType,
        tableNumber: running.tableName || "",
        customerNote: running.cart.orderNote,
        status: "preparing",
        statusHistory: [{ status: "preparing", note: "Pay Later order sent to kitchen.", changedAt: running.openedAt }],
        paymentStatus: "pending",
        paymentMethod: "cash",
        paymentBreakdown: [],
        couponCode: "",
        couponDiscount: 0,
        coinsRedeemed: 0,
        coinDiscount: 0,
        coinsEarned: 0,
        subtotal: totals.subtotal,
        taxTotal: totals.taxAmount,
        discountTotal: totals.discountAmount,
        grandTotal: totals.grandTotal,
        itemCount: totals.itemCount,
        createdAt: running.openedAt,
        updatedAt: running.updatedAt,
      };
    });

    const combinedOrders = includeRunningOrders
      ? [...orders, ...runningOrderRows].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        )
      : orders;

    const statusCounts = groupedStatuses.reduce<Record<string, number>>(
      (result, item) => {
        result[item._id] = item.count;
        return result;
      },
      {},
    );
    statusCounts.all = groupedStatuses.reduce((sum, item) => sum + item.count, 0);

    return successResponse(
      {
        orders: combinedOrders,
        pagination: {
          page,
          limit,
          total: total + runningOrderRows.length,
          pages: Math.ceil((total + runningOrderRows.length) / limit),
        },
        statusCounts,
      },
      "Orders loaded.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
