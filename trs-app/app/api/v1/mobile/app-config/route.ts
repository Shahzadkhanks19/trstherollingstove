import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { getMobileAppConfig } from "@/services/mobile.service";

export async function GET() {
  try {
    await connectToDatabase();

    return successResponse(
      await getMobileAppConfig(),
      "Mobile application configuration loaded.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
