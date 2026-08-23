import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { JobApplication } from "@/models/JobApplication";

const schema = z.object({ status: z.enum(["new","reviewing","shortlisted","rejected","hired"]) });
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("cms.manage"); const { id } = await context.params;
    const input = await validateRequestBody(request, schema); await connectToDatabase();
    const row = await JobApplication.findByIdAndUpdate(id, { $set: { status: input.status, reviewedBy: actor.id, reviewedAt: new Date() } }, { returnDocument: "after", runValidators: true });
    if (!row) throw new AppError("Application not found.", 404);
    return successResponse(row, "Application status updated.");
  } catch (error) { return handleApiError(error); }
}
