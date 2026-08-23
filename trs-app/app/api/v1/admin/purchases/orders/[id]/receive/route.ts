import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { receivePurchaseOrder } from "@/services/purchase.service";
import { createGoodsReceiptSchema } from "@/validators/purchases";

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
      createGoodsReceiptSchema,
    );

    await connectToDatabase();

    const receipt = await receivePurchaseOrder({
      purchaseOrderId: id,
      ...input,
      actorId: actor.id,
    });

    return successResponse(
      receipt,
      "Goods receipt created and inventory updated.",
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
