import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import {
  getPublicMenuItem,
} from "@/services/publicWebsite.service";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    await connectToDatabase();

    const { slug } =
      await context.params;

    const item =
      await getPublicMenuItem(slug);

    if (!item) {
      return Response.json(
        {
          success: false,
          message:
            "Menu item not found.",
        },
        {
          status: 404,
        },
      );
    }

    return successResponse(item);
  } catch (error) {
    return handleApiError(error);
  }
}
