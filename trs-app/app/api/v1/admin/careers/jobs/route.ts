import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { CareerOpening } from "@/models/CareerOpening";
import { createCareerOpeningSchema } from "@/validators/careers";

export async function GET() {
  try {
    await requirePermission("cms.read");
    await connectToDatabase();
    const items = await CareerOpening.find().sort({ sortOrder: 1, createdAt: -1 }).lean();
    return successResponse(items);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("cms.manage");
    const input = await validateRequestBody(request, createCareerOpeningSchema);
    await connectToDatabase();
    const item = await CareerOpening.create({ ...input, createdBy: actor.id, updatedBy: actor.id });
    return successResponse(item, "Job opening created.", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
