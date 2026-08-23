import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { ContactMessage } from "@/models/ContactMessage";
import { writeAuditLog } from "@/services/audit.service";
import { publishEnquiryEvent } from "@/services/realtimeEvents.service";
import { updateContactMessageSchema } from "@/validators/contactMessage";

type Context = { params: Promise<{ enquiryId: string }> };

export async function GET(_: Request, context: Context) {
  try {
    const actor = await requirePermission("notifications.read");
    await connectToDatabase();
    const { enquiryId } = await context.params;
    const existing = await ContactMessage.findById(enquiryId).lean();
    if (!existing) throw new AppError("Enquiry not found.", 404);

    if (existing.isRead) return successResponse(existing, "Enquiry loaded.");

    const enquiry = await ContactMessage.findByIdAndUpdate(
      enquiryId,
      { $set: { isRead: true } },
      { returnDocument: "after", runValidators: true },
    ).lean();
    if (!enquiry) throw new AppError("Enquiry not found.", 404);

    publishEnquiryEvent({
      action: "updated",
      enquiryId,
      actorId: actor.id,
      status: enquiry.status,
    });
    return successResponse(enquiry, "Enquiry loaded.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requirePermission("notifications.manage");
    const input = await validateRequestBody(request, updateContactMessageSchema);
    await connectToDatabase();
    const { enquiryId } = await context.params;
    const update: Record<string, unknown> = { ...input };
    if (input.status === "resolved") update.resolvedAt = new Date();
    if (input.status && input.status !== "resolved") update.resolvedAt = null;

    const enquiry = await ContactMessage.findByIdAndUpdate(
      enquiryId,
      { $set: update },
      { returnDocument: "after", runValidators: true },
    ).lean();
    if (!enquiry) throw new AppError("Enquiry not found.", 404);

    await writeAuditLog({
      actorUserId: actor.id,
      action: "enquiry.updated",
      entityType: "contact_message",
      entityId: enquiryId,
      description: `Enquiry updated with status ${enquiry.status}.`,
    });
    publishEnquiryEvent({ action: "updated", enquiryId, actorId: actor.id, status: enquiry.status });
    return successResponse(enquiry, "Enquiry updated.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_: Request, context: Context) {
  try {
    const actor = await requirePermission("notifications.manage");
    await connectToDatabase();
    const { enquiryId } = await context.params;
    const enquiry = await ContactMessage.findByIdAndDelete(enquiryId).lean();
    if (!enquiry) throw new AppError("Enquiry not found.", 404);

    await writeAuditLog({
      actorUserId: actor.id,
      action: "enquiry.deleted",
      entityType: "contact_message",
      entityId: enquiryId,
      description: `Enquiry from ${enquiry.email} deleted.`,
    });
    publishEnquiryEvent({ action: "updated", enquiryId, actorId: actor.id, status: "deleted" });
    return successResponse({ id: enquiryId }, "Enquiry deleted.");
  } catch (error) {
    return handleApiError(error);
  }
}
