import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { Testimonial } from "@/models/Testimonial";
import { updateTestimonialSchema } from "@/validators/cms";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requirePermission("cms.manage");
    const { id } = await context.params;
    const input = await validateRequestBody(request, updateTestimonialSchema);
    await connectToDatabase();

    const testimonial = await Testimonial.findByIdAndUpdate(
      id,
      { $set: { ...input, updatedBy: actor.id } },
      { returnDocument: "after" },
    );

    if (!testimonial) throw new AppError("Testimonial not found.", 404);
    return successResponse(testimonial, "Testimonial updated.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    await requirePermission("cms.manage");
    const { id } = await context.params;
    await connectToDatabase();

    const testimonial = await Testimonial.findByIdAndDelete(id);
    if (!testimonial) throw new AppError("Testimonial not found.", 404);

    return successResponse(null, "Testimonial deleted.");
  } catch (error) {
    return handleApiError(error);
  }
}
