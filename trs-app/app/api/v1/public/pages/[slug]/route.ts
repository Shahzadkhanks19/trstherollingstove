import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import {
  getPublicPage,
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

    const page =
      await getPublicPage(slug);

    if (!page) {
      return Response.json(
        {
          success: false,
          message: "Page not found.",
        },
        {
          status: 404,
        },
      );
    }

    return successResponse(page);
  } catch (error) {
    return handleApiError(error);
  }
}
