import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { SiteBanner } from "@/models/SiteBanner";
import { createBannerSchema } from "@/validators/cms";

export async function GET() {
  try {
    await requirePermission("cms.read");
    await connectToDatabase();
    return successResponse(await SiteBanner.find().sort({ placement: 1, sortOrder: 1 }).lean());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("cms.manage");
    const input = await validateRequestBody(request, createBannerSchema);
    await connectToDatabase();

    const banner = await SiteBanner.create({
      ...input,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      createdBy: actor.id,
      updatedBy: actor.id,
    });

    return successResponse(banner, "Banner created.", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
