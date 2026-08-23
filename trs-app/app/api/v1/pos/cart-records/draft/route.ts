import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { calculatePosCartTotals, parseStoredPosCart } from "@/lib/pos/cart";
import { POSCartRecord } from "@/models/POSCartRecord";
import { validatePersistedPosCart } from "@/services/posCartValidation.service";
import { publishPosCartRecordChanged } from "@/services/realtimeEvents.service";

export async function GET() {
  try {
    const actor = await requirePermission("pos.use");
    await connectToDatabase();
    const record = await POSCartRecord.findOne({ ownerId: actor.id, status: "draft" }).lean();
    return successResponse(record ? { id: String(record._id), cart: record.cartSnapshot, updatedAt: record.updatedAt } : null);
  } catch (error) { return handleApiError(error); }
}

export async function PUT(request: Request) {
  try {
    const actor = await requirePermission("pos.use");
    const body = await request.json() as { cart?: unknown };
    const cart = parseStoredPosCart(JSON.stringify(body.cart ?? null));
    await connectToDatabase();
    if (!cart.lines.length) {
      await POSCartRecord.deleteOne({ ownerId: actor.id, status: "draft" });
      return successResponse(null, "Empty draft cleared.");
    }
    await validatePersistedPosCart(cart);
    const totals = calculatePosCartTotals(cart);
    const record = await POSCartRecord.findOneAndUpdate(
      { ownerId: actor.id, status: "draft" },
      { $set: { cartSnapshot: cart, customerId: cart.customer.id || null, customerSnapshot: cart.customer, itemCount: totals.itemCount, grandTotal: totals.grandTotal, lastSavedAt: new Date() }, $setOnInsert: { ownerId: actor.id, status: "draft", title: "Autosaved cart" } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
    if (record) publishPosCartRecordChanged({ recordId: String(record._id), status: "draft", action: "updated", actorId: actor.id });
    return successResponse({ id: String(record?._id), updatedAt: record?.updatedAt }, "Draft saved.");
  } catch (error) { return handleApiError(error); }
}
