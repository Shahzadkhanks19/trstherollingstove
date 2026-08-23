import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import {
  getPublicSiteMetadata,
} from "@/services/publicWebsite.service";

export async function GET() {
  try {
    await connectToDatabase();

    const settings =
      await getPublicSiteMetadata();

    return successResponse(settings);
  } catch (error) {
    return handleApiError(error);
  }
}
