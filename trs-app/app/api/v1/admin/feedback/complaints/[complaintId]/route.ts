import { Types } from "mongoose";

import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { CustomerComplaint } from "@/models/CustomerComplaint";
import { complaintUpdateSchema } from "@/validators/feedback-reputation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ complaintId: string }> },
) {
  try {
    const actor = await requirePermission("reviews.manage");
    const input = await validateRequestBody(request, complaintUpdateSchema);

    await connectToDatabase();

    const { complaintId } = await params;
    const complaint = await CustomerComplaint.findById(complaintId);

    if (!complaint) {
      throw new AppError("Complaint not found.", 404);
    }

    if (input.status) {
      complaint.status = input.status;
    }

    if (input.priority) {
      complaint.priority = input.priority;
    }

    if (input.assignedTo !== undefined) {
      if (input.assignedTo && !Types.ObjectId.isValid(input.assignedTo)) {
        throw new AppError("Invalid assignee ID.", 400);
      }

      complaint.assignedTo = input.assignedTo
        ? new Types.ObjectId(input.assignedTo)
        : null;
    }

    if (!complaint.firstResponseAt) {
      complaint.firstResponseAt = new Date();
    }

    if (input.resolution) {
      if (!Types.ObjectId.isValid(actor.id)) {
        throw new AppError("Invalid resolver ID.", 400);
      }

      complaint.resolution = {
        ...input.resolution,
        resolvedBy: new Types.ObjectId(actor.id),
        resolvedAt: new Date(),
      };
      complaint.status = "resolved";
    }

    await complaint.save();

    return successResponse(complaint, "Complaint updated.");
  } catch (error) {
    return handleApiError(error);
  }
}
