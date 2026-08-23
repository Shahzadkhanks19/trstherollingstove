import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import {
  getPublicOffers,
} from "@/services/publicWebsite.service";

export async function GET() {
  try {
    await connectToDatabase();

    const items =
      await getPublicOffers();

    return successResponse({
      items,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
