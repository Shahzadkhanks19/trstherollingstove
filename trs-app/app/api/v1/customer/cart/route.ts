import { requireAuthenticatedUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { getOrCreateCart, recalculateCart } from "@/services/cart.service";
import { updateCartPreferencesSchema } from "@/validators/order";

async function customer() {
  const actor = await requireAuthenticatedUser();
  if (actor.roleKey !== "customer") throw new AppError("Customer access required.", 403);
  return actor;
}

export async function GET() {
  try {
    const actor = await customer();
    await connectToDatabase();
    await getOrCreateCart(actor.id);
    return successResponse(await recalculateCart(actor.id), "Cart loaded.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await customer();
    const input = await validateRequestBody(request, updateCartPreferencesSchema);
    await connectToDatabase();
    const cart = await getOrCreateCart(actor.id);

    if (input.orderMode !== undefined) cart.orderMode = input.orderMode;
    if (input.tableNumber !== undefined) cart.tableNumber = input.tableNumber;
    if (input.requestedPickupAt !== undefined) {
      cart.requestedPickupAt = input.requestedPickupAt
        ? new Date(input.requestedPickupAt)
        : null;
    }
    if (input.customerNote !== undefined) cart.customerNote = input.customerNote;

    if (cart.orderMode === "takeaway") cart.tableNumber = "";
    await cart.save();
    return successResponse(await recalculateCart(actor.id), "Cart preferences updated.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE() {
  try {
    const actor = await customer();
    await connectToDatabase();
    const cart = await getOrCreateCart(actor.id);
    cart.items.splice(0, cart.items.length);
    cart.subtotal = 0;
    cart.taxTotal = 0;
    cart.discountTotal = 0;
    cart.grandTotal = 0;
    cart.itemCount = 0;
    await cart.save();
    return successResponse(cart, "Cart cleared.");
  } catch (error) {
    return handleApiError(error);
  }
}
