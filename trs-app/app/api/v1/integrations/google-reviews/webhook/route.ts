import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { ReputationIntegration } from "@/models/ReputationIntegration";

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("x-trs-webhook-secret") ?? "";
    await connectToDatabase();
    const integration = await ReputationIntegration.findOne({ provider: "google_business_profile", isEnabled: true }).select("+webhookSecret");
    if (!integration || !integration.webhookSecret || signature !== integration.webhookSecret) {
      return new Response("Unauthorized", { status: 401 });
    }
    const payload = await request.json();
    integration.lastSyncAt = new Date();
    integration.lastSyncStatus = "success";
    integration.lastSyncMessage = `Webhook received: ${typeof payload === "object" ? "review event" : "unknown payload"}`;
    await integration.save();
    return successResponse({ accepted: true }, "Google review event accepted.");
  } catch (error) {
    return handleApiError(error);
  }
}
