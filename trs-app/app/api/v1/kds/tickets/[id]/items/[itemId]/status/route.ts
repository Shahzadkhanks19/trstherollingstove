import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { KitchenTicket } from "@/models/KitchenTicket";
import { recalculateKitchenTicketStatus } from "@/services/kds.service";
import { updateTicketItemStatusSchema } from "@/validators/kds";

type Context = {
  params: Promise<{
    id: string;
    itemId: string;
  }>;
};

export async function PATCH(
  request: Request,
  context: Context,
) {
  try {
    const actor = await requirePermission("kds.use");
    const { id, itemId } = await context.params;
    const input = await validateRequestBody(
      request,
      updateTicketItemStatusSchema,
    );

    await connectToDatabase();

    const ticket = await KitchenTicket.findById(id);

    if (!ticket) {
      throw new AppError("Kitchen ticket not found.", 404);
    }

    const item = ticket.items.id(itemId);

    if (!item) {
      throw new AppError(
        "Kitchen ticket item not found.",
        404,
      );
    }

    const now = new Date();
    item.status = input.status;

    if (input.status === "accepted") {
      item.acceptedAt = now;
    }

    if (input.status === "preparing") {
      item.startedAt = now;
    }

    if (input.status === "ready") {
      item.readyAt = now;
    }

    if (input.status === "served") {
      item.servedAt = now;
    }

    if (input.status === "cancelled") {
      item.cancelledAt = now;
    }

    await ticket.save();

    const updatedTicket =
      await recalculateKitchenTicketStatus(id, actor.id);

    return successResponse(
      updatedTicket,
      "Kitchen ticket item status updated.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
