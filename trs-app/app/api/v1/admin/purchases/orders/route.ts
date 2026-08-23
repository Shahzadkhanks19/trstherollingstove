import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { PurchaseOrder } from "@/models/PurchaseOrder";
import { createPurchaseOrder } from "@/services/purchase.service";
import { createPurchaseOrderSchema } from "@/validators/purchases";

export async function GET(request: Request) {
  try {
    await requirePermission("purchases.read");
    await connectToDatabase();

    const url = new URL(request.url);
    const supplierId =
      url.searchParams.get("supplierId");
    const status = url.searchParams.get("status");

    const filter: Record<string, unknown> = {};

    if (supplierId) {
      filter.supplierId = supplierId;
    }

    if (status) {
      filter.status = status;
    }

    const purchaseOrders =
      await PurchaseOrder.find(filter)
.populate("supplierId", "name code phone")
        .sort({ orderDate: -1 })
        .lean();

    return successResponse(purchaseOrders);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission(
      "purchases.manage",
    );
    const input = await validateRequestBody(
      request,
      createPurchaseOrderSchema,
    );

    await connectToDatabase();

    const purchaseOrder =
      await createPurchaseOrder({
        ...input,
        actorId: actor.id,
      });

    return successResponse(
      purchaseOrder,
      "Purchase order created.",
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
