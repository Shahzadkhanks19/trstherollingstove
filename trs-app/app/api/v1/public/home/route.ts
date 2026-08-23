import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import {
  getPublicHomeData,
} from "@/services/publicWebsite.service";

export async function GET() {
  try {
    await connectToDatabase();

    const data =
      await getPublicHomeData();

    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}
