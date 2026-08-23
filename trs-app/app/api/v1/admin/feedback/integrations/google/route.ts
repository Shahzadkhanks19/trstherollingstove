import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { ReputationIntegration } from "@/models/ReputationIntegration";
import { integrationUpdateSchema } from "@/validators/feedback-reputation";

export async function GET() {
  try {
    await requirePermission("settings.manage");
    await connectToDatabase();
    const integration = await ReputationIntegration.findOne({ provider: "google_business_profile" }).lean();
    return successResponse(integration);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requirePermission("settings.manage");
    const input = await validateRequestBody(request, integrationUpdateSchema);
    await connectToDatabase();
    const integration = await ReputationIntegration.findOneAndUpdate(
      { provider: "google_business_profile" },
      { $set: input, $setOnInsert: { provider: "google_business_profile" } },
      { new: true, upsert: true, runValidators: true, returnDocument: "after" },
    ).lean();
    return successResponse(integration, "Google review integration settings updated.");
  } catch (error) {
    return handleApiError(error);
  }
}
