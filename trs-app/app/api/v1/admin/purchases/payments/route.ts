import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { SupplierPayment } from "@/models/SupplierPayment";
import { recordSupplierPayment } from "@/services/purchase.service";
import { createSupplierPaymentSchema } from "@/validators/purchases";

export async function GET(request: Request) {
  try {
    await requirePermission("purchases.read");
    await connectToDatabase();

    const url = new URL(request.url);
    const supplierId =
      url.searchParams.get("supplierId");
    const purchaseOrderId =
      url.searchParams.get("purchaseOrderId");

    const filter: Record<string, unknown> = {};

    if (supplierId) {
      filter.supplierId = supplierId;
    }

    if (purchaseOrderId) {
      filter.purchaseOrderId =
        purchaseOrderId;
    }

    const payments =
      await SupplierPayment.find(filter)
        .populate(
          "supplierId",
          "name code",
        )
        .populate(
          "purchaseOrderId",
          "purchaseOrderNumber grandTotal balanceAmount",
        )
        .populate(
          "recordedBy",
          "name",
        )
        .sort({ paymentDate: -1 })
        .lean();

    return successResponse(payments);
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
      createSupplierPaymentSchema,
    );

    await connectToDatabase();

    const payment = await recordSupplierPayment({
      ...input,
      actorId: actor.id,
    });

    return successResponse(
      payment,
      "Supplier payment recorded.",
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
