import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { Testimonial } from "@/models/Testimonial";
import { createTestimonialSchema } from "@/validators/cms";

export async function GET() {
  try {
    await requirePermission("cms.read");
    await connectToDatabase();
    return successResponse(await Testimonial.find().sort({ isFeatured: -1, sortOrder: 1 }).lean());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("cms.manage");
    const input = await validateRequestBody(request, createTestimonialSchema);
    await connectToDatabase();

    const testimonial = await Testimonial.create({
      ...input,
      createdBy: actor.id,
      updatedBy: actor.id,
    });

    return successResponse(testimonial, "Testimonial created.", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
