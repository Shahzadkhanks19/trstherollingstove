import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import {
  getPublicMenu,
} from "@/services/publicWebsite.service";
import {
  publicMenuQuerySchema,
} from "@/validators/publicWebsite";

export async function GET(
  request: Request,
) {
  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const parsed =
      publicMenuQuerySchema.parse(
        Object.fromEntries(
          url.searchParams.entries(),
        ),
      );

    const result =
      await getPublicMenu(parsed);

    return successResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}
