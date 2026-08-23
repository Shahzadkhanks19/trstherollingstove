import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import {
  processRazorpayWebhook,
  verifyWebhookSignature,
} from "@/services/payment.service";

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("x-razorpay-signature");
    const eventId = request.headers.get("x-razorpay-event-id");

    if (!signature) throw new AppError("Webhook signature is missing.", 400);
    if (!eventId) throw new AppError("Webhook event ID is missing.", 400);

    const rawBody = await request.text();

    if (!verifyWebhookSignature(rawBody, signature)) {
      throw new AppError("Invalid webhook signature.", 401);
    }

    const payload: unknown = JSON.parse(rawBody);
    if (!payload || typeof payload !== "object") {
      throw new AppError("Invalid webhook payload.", 400);
    }

    await connectToDatabase();

    const result = await processRazorpayWebhook({
      eventId,
      payload: payload as Parameters<
        typeof processRazorpayWebhook
      >[0]["payload"],
    });

    return successResponse(result, "Webhook processed.");
  } catch (error) {
    return handleApiError(error);
  }
}
