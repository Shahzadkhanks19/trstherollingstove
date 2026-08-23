import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { calculatePosCartTotals, parseStoredPosCart } from "@/lib/pos/cart";
import { POSCartRecord } from "@/models/POSCartRecord";
import { writeAuditLog } from "@/services/audit.service";
import { validatePersistedPosCart } from "@/services/posCartValidation.service";
import { publishPosCartRecordChanged } from "@/services/realtimeEvents.service";

function parseCart(value: unknown) {
  const cart = parseStoredPosCart(JSON.stringify(value ?? null));
  if (!cart.lines.length) throw new AppError("Add at least one item before holding the order.", 422);
  return cart;
}

export async function GET() {
  try {
    const actor = await requirePermission("pos.use");
    await connectToDatabase();
    const records = await POSCartRecord.find({ ownerId: actor.id, status: "held" })
      .sort({ updatedAt: -1 })
      .lean();
    return successResponse(records.map((record) => ({
      id: String(record._id), title: record.title || "Held order", cart: record.cartSnapshot,
      itemCount: record.itemCount, grandTotal: record.grandTotal,
      createdAt: record.createdAt, updatedAt: record.updatedAt,
    })));
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("pos.use");
    const body = await request.json() as { title?: unknown; cart?: unknown };
    const cart = parseCart(body.cart);
    await connectToDatabase();
    await validatePersistedPosCart(cart);
    const totals = calculatePosCartTotals(cart);
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 120) : "";
    const record = await POSCartRecord.create({
      ownerId: actor.id, status: "held", customerId: cart.customer.id || null, customerSnapshot: cart.customer, title: title || `Held order · ${totals.itemCount} item${totals.itemCount === 1 ? "" : "s"}`,
      cartSnapshot: cart, itemCount: totals.itemCount, grandTotal: totals.grandTotal, lastSavedAt: new Date(),
    });
    await writeAuditLog({ actor, action: "pos.cart_held", module: "pos", entityType: "pos_cart_record", entityId: record.id, description: `POS order held by ${actor.name}.`, metadata: { itemCount: totals.itemCount, grandTotal: totals.grandTotal } });
    publishPosCartRecordChanged({ recordId: record.id, status: "held", action: "created", actorId: actor.id });
    return successResponse({ id: String(record._id) }, "Order held successfully.", 201);
  } catch (error) { return handleApiError(error); }
}
