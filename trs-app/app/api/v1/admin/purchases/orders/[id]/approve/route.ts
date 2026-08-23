import { Types } from "mongoose";

import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { PurchaseOrder } from "@/models/PurchaseOrder";
import { Supplier } from "@/models/Supplier";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(
  _request: Request,
  context: Context,
) {
  try {
    const actor = await requirePermission(
      "purchases.manage",
    );
    const { id } = await context.params;

    await connectToDatabase();

    const purchaseOrder =
      await PurchaseOrder.findOne({
        _id: id,
        status: "draft",
      });

    if (!purchaseOrder) {
      throw new AppError(
        "Draft purchase order not found.",
        404,
      );
    }

    purchaseOrder.status = "approved";
    purchaseOrder.approvedBy =
      new Types.ObjectId(actor.id);
    purchaseOrder.approvedAt = new Date();
    purchaseOrder.updatedBy =
      new Types.ObjectId(actor.id);

    await purchaseOrder.save();

    await Supplier.findByIdAndUpdate(
      purchaseOrder.supplierId,
      {
        $inc: {
          outstandingBalance:
            purchaseOrder.grandTotal,
        },
        $set: {
          updatedBy: actor.id,
        },
      },
    );

    return successResponse(
      purchaseOrder,
      "Purchase order approved.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
