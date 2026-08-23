import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { PurchaseOrder } from "@/models/PurchaseOrder";
import { updatePurchaseOrderSchema } from "@/validators/purchases";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  context: Context,
) {
  try {
    await requirePermission("purchases.read");
    const { id } = await context.params;

    await connectToDatabase();

    const purchaseOrder =
      await PurchaseOrder.findById(id)
        .populate(
          "supplierId",
          "name code phone gstin",
        )
        .populate(
          "items.inventoryItemId",
          "name sku unit currentStock",
        )
        .lean();

    if (!purchaseOrder) {
      throw new AppError(
        "Purchase order not found.",
        404,
      );
    }

    return successResponse(purchaseOrder);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  context: Context,
) {
  try {
    const actor = await requirePermission(
      "purchases.manage",
    );
    const { id } = await context.params;
    const input = await validateRequestBody(
      request,
      updatePurchaseOrderSchema,
    );

    await connectToDatabase();

    const purchaseOrder =
      await PurchaseOrder.findOneAndUpdate(
        {
          _id: id,
          status: "draft",
        },
        {
          $set: {
            ...input,
            updatedBy: actor.id,
          },
        },
        {
          returnDocument: "after",
        },
      );

    if (!purchaseOrder) {
      throw new AppError(
        "Editable draft purchase order not found.",
        404,
      );
    }

    return successResponse(
      purchaseOrder,
      "Purchase order updated.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: Context,
) {
  try {
    await requirePermission("purchases.manage");
    const { id } = await context.params;
    await connectToDatabase();

    const [{ GoodsReceipt }, { SupplierPayment }] = await Promise.all([
      import("@/models/GoodsReceipt"),
      import("@/models/SupplierPayment"),
    ]);
    const [receiptCount, paymentCount] = await Promise.all([
      GoodsReceipt.countDocuments({ purchaseOrderId: id }),
      SupplierPayment.countDocuments({ purchaseOrderId: id }),
    ]);
    if (receiptCount > 0 || paymentCount > 0) {
      throw new AppError("This order has receipt or payment records and cannot be deleted.", 409);
    }

    const purchaseOrder = await PurchaseOrder.findByIdAndDelete(id);
    if (!purchaseOrder) throw new AppError("Purchase order not found.", 404);
    return successResponse({ id }, "Purchase order deleted.");
  } catch (error) {
    return handleApiError(error);
  }
}
