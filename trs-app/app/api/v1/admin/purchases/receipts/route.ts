import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { GoodsReceipt } from "@/models/GoodsReceipt";

export async function GET(request: Request) {
  try {
    await requirePermission("purchases.read");
    await connectToDatabase();

    const url = new URL(request.url);
    const purchaseOrderId =
      url.searchParams.get("purchaseOrderId");
    const supplierId =
      url.searchParams.get("supplierId");

    const filter: Record<string, unknown> = {};

    if (purchaseOrderId) {
      filter.purchaseOrderId = purchaseOrderId;
    }

    if (supplierId) {
      filter.supplierId = supplierId;
    }

    const receipts = await GoodsReceipt.find(filter)
      .populate(
        "purchaseOrderId",
        "purchaseOrderNumber status",
      )
      .populate(
        "supplierId",
        "name code",
      )
      .populate(
        "items.inventoryItemId",
        "name sku unit",
      )
      .populate(
        "receivedBy",
        "name",
      )
      .sort({ receivedAt: -1 })
      .lean();

    return successResponse(receipts);
  } catch (error) {
    return handleApiError(error);
  }
}
