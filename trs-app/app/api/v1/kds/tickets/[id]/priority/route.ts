import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { KitchenTicket } from "@/models/KitchenTicket";
import {
  publishKdsQueueUpdated,
  publishKdsTicketUpdated,
} from "@/services/realtimeEvents.service";
import { updateTicketPrioritySchema } from "@/validators/kds";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: Request,
  context: Context,
) {
  try {
    const actor = await requirePermission("kds.manage");
    const { id } = await context.params;
    const input = await validateRequestBody(
      request,
      updateTicketPrioritySchema,
    );

    await connectToDatabase();

    const ticket = await KitchenTicket.findByIdAndUpdate(
      id,
      {
        $set: {
          priority: input.priority,
        },
      },
      {
        returnDocument: "after",
      },
    );

    if (!ticket) {
      throw new AppError("Kitchen ticket not found.", 404);
    }

    publishKdsTicketUpdated({
      ticketId: String(ticket._id),
      orderId: String(ticket.orderId),
      orderNumber: ticket.orderNumber,
      stationId: String(ticket.stationId),
      status: ticket.status,
      priority: ticket.priority,
      actorId: actor.id,
    });
    publishKdsQueueUpdated("ticket.priority_updated");

    return successResponse(
      ticket,
      "Kitchen ticket priority updated.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
