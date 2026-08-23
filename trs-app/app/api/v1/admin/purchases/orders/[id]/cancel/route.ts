import { Types } from "mongoose";

import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { PurchaseOrder } from "@/models/PurchaseOrder";
import { Supplier } from "@/models/Supplier";
import { cancelPurchaseOrderSchema } from "@/validators/purchases";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(
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
      cancelPurchaseOrderSchema,
    );

    await connectToDatabase();

    const purchaseOrder =
      await PurchaseOrder.findById(id);

    if (!purchaseOrder) {
      throw new AppError(
        "Purchase order not found.",
        404,
      );
    }

    if (
      !["draft", "approved"].includes(
        purchaseOrder.status,
      )
    ) {
      throw new AppError(
        "Received purchase orders cannot be cancelled.",
        409,
      );
    }

    const wasApproved =
      purchaseOrder.status === "approved";

    purchaseOrder.status = "cancelled";
    purchaseOrder.cancelledBy =
      new Types.ObjectId(actor.id);
    purchaseOrder.cancelledAt = new Date();
    purchaseOrder.cancellationReason =
      input.reason;
    purchaseOrder.updatedBy =
      new Types.ObjectId(actor.id);

    await purchaseOrder.save();

    if (wasApproved) {
      await Supplier.findByIdAndUpdate(
        purchaseOrder.supplierId,
        {
          $inc: {
            outstandingBalance:
              -purchaseOrder.balanceAmount,
          },
          $set: {
            updatedBy: actor.id,
          },
        },
      );
    }

    return successResponse(
      purchaseOrder,
      "Purchase order cancelled.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
