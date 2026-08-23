import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { getAllPublicSettings } from "@/services/settings.service";

export async function GET() {
  try {
    await connectToDatabase();

    const settings =
      await getAllPublicSettings();

    return successResponse(settings);
  } catch (error) {
    return handleApiError(error);
  }
}
