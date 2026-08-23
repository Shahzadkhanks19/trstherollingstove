import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { writeAuditLog } from "@/services/audit.service";
import { refundRazorpayPayment } from "@/services/payment.service";
import { refundPaymentSchema } from "@/validators/payment";

type Context = { params: Promise<{ paymentId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const actor = await requirePermission("payments.manage");
    const { paymentId } = await context.params;
    const input = await validateRequestBody(request, refundPaymentSchema);
    await connectToDatabase();

    const payment = await refundRazorpayPayment({
      paymentId,
      actorId: actor.id,
      amount: input.amount,
      reason: input.reason,
    });

    await writeAuditLog({
      actorUserId: actor.id,
      action: "payment.refunded",
      entityType: "payment",
      entityId: payment.id,
      description: input.reason,
      metadata: {
        amount: input.amount ?? payment.amountRefunded,
        providerRefundId: payment.providerRefundId,
      },
    });


    return successResponse(payment, "Refund initiated successfully.");
  } catch (error) {
    return handleApiError(error);
  }
}
