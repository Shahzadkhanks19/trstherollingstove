import { isValidObjectId } from "mongoose";
import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { POSCartRecord } from "@/models/POSCartRecord";
import { writeAuditLog } from "@/services/audit.service";
import { publishPosCartRecordChanged } from "@/services/realtimeEvents.service";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requirePermission("pos.use");
    const { id } = await context.params;
    if (!isValidObjectId(id)) throw new AppError("Invalid held order.", 400);
    const body = await request.json() as { title?: unknown };
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 120) : "";
    if (!title) throw new AppError("Held order name is required.", 422);
    await connectToDatabase();
    const record = await POSCartRecord.findOneAndUpdate(
      { _id: id, ownerId: actor.id, status: "held" },
      { $set: { title, lastSavedAt: new Date() } }, { new: true },
    ).lean();
    if (!record) throw new AppError("Held order not found.", 404);
    await writeAuditLog({ actor, action: "pos.held_order_renamed", module: "pos", entityType: "pos_cart_record", entityId: String(record._id), description: `Held POS order renamed to ${title}.` });
    publishPosCartRecordChanged({ recordId: String(record._id), status: "held", action: "updated", actorId: actor.id });
    return successResponse({ id: String(record._id), title: record.title }, "Held order renamed.");
  } catch (error) { return handleApiError(error); }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const actor = await requirePermission("pos.use");
    const { id } = await context.params;
    if (!isValidObjectId(id)) throw new AppError("Invalid held order.", 400);
    await connectToDatabase();
    const deleted = await POSCartRecord.findOneAndDelete({ _id: id, ownerId: actor.id, status: "held" });
    if (!deleted) throw new AppError("Held order not found.", 404);
    await writeAuditLog({ actor, action: "pos.held_order_deleted", module: "pos", entityType: "pos_cart_record", entityId: id, description: "Held POS order deleted." });
    publishPosCartRecordChanged({ recordId: id, status: "held", action: "deleted", actorId: actor.id });
    return successResponse({ id }, "Held order deleted.");
  } catch (error) { return handleApiError(error); }
}
