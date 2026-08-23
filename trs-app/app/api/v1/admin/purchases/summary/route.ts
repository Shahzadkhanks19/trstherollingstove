import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { PurchaseOrder } from "@/models/PurchaseOrder";
import { Supplier } from "@/models/Supplier";

export async function GET() {
  try {
    await requirePermission("purchases.read");
    await connectToDatabase();

    const [
      orderSummary,
      supplierSummary,
    ] = await Promise.all([
      PurchaseOrder.aggregate([
        {
          $match: {
            status: { $ne: "cancelled" },
          },
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalPurchaseValue: {
              $sum: "$grandTotal",
            },
            totalPaid: {
              $sum: "$paidAmount",
            },
            totalOutstanding: {
              $sum: "$balanceAmount",
            },
            openOrders: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      "$status",
                      [
                        "draft",
                        "approved",
                        "partially_received",
                      ],
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
      Supplier.aggregate([
        {
          $match: {
            isActive: true,
          },
        },
        {
          $group: {
            _id: null,
            activeSuppliers: { $sum: 1 },
            supplierOutstanding: {
              $sum: "$outstandingBalance",
            },
          },
        },
      ]),
    ]);

    return successResponse({
      totalOrders:
        orderSummary[0]?.totalOrders ?? 0,
      openOrders:
        orderSummary[0]?.openOrders ?? 0,
      totalPurchaseValue:
        orderSummary[0]?.totalPurchaseValue ?? 0,
      totalPaid:
        orderSummary[0]?.totalPaid ?? 0,
      totalOutstanding:
        orderSummary[0]?.totalOutstanding ?? 0,
      activeSuppliers:
        supplierSummary[0]?.activeSuppliers ?? 0,
      supplierOutstanding:
        supplierSummary[0]?.supplierOutstanding ?? 0,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
